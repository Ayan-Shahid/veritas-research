"""QLoRA fine-tunes an open-source instruct model on the exported
memo-generation SFT dataset (see backend/scripts/export_training_data.py).

Meant to run on a GPU machine — a rented GPU or Colab. This repo was
built in a sandbox with no GPU and no network to download model
weights, so this script is written to be complete and correct by
inspection, not executed as part of the build itself. Run it, then
register the result:

    python train_lora.py \
        --dataset ../backend/data/training/sft-20260912-018ex.jsonl \
        --base-model meta-llama/Meta-Llama-3.1-8B-Instruct \
        --output-dir ./runs/llama3.1-8b-memo-v1 \
        --epochs 3

    python ../backend/scripts/record_finetune_run.py \
        ./runs/llama3.1-8b-memo-v1/training_run_metadata.json

Library flag: transformers/peft/trl move fast and their exact argument
names (e.g. SFTTrainer's tokenizer/processing_class kwarg) have
changed across versions. This targets the pinned versions in
requirements.txt — if you're on newer ones, check for deprecation
warnings on first run before trusting the output.
"""
from __future__ import annotations

import argparse
import json
from dataclasses import asdict, dataclass
from pathlib import Path

import torch
from datasets import load_dataset
from peft import LoraConfig, get_peft_model
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from trl import DataCollatorForCompletionOnlyLM, SFTConfig, SFTTrainer


@dataclass
class Hyperparams:
    lora_r: int
    lora_alpha: int
    lora_dropout: float
    learning_rate: float
    epochs: int
    per_device_batch_size: int
    gradient_accumulation_steps: int


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", required=True, help="Path to the exported SFT JSONL file")
    parser.add_argument("--base-model", default="meta-llama/Meta-Llama-3.1-8B-Instruct")
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--lr", type=float, default=2e-4)
    parser.add_argument("--lora-r", type=int, default=16)
    parser.add_argument("--lora-alpha", type=int, default=32)
    parser.add_argument("--lora-dropout", type=float, default=0.05)
    parser.add_argument("--batch-size", type=int, default=2)
    parser.add_argument("--grad-accum", type=int, default=8)
    parser.add_argument(
        "--response-template",
        default="<|start_header_id|>assistant<|end_header_id|>\n\n",
        help=(
            "Token sequence marking the start of the assistant turn, used to mask "
            "prompt tokens out of the loss so the model only learns to predict the "
            "completion, not its own instructions. Default matches Llama 3.1's chat "
            "template. For Mistral-Instruct, use '[/INST]' instead."
        ),
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    hp = Hyperparams(
        lora_r=args.lora_r,
        lora_alpha=args.lora_alpha,
        lora_dropout=args.lora_dropout,
        learning_rate=args.lr,
        epochs=args.epochs,
        per_device_batch_size=args.batch_size,
        gradient_accumulation_steps=args.grad_accum,
    )

    dataset_version = Path(args.dataset).stem

    tokenizer = AutoTokenizer.from_pretrained(args.base_model)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
        bnb_4bit_use_double_quant=True,
    )

    model = AutoModelForCausalLM.from_pretrained(
        args.base_model,
        quantization_config=bnb_config,
        device_map="auto",
    )
    model.config.use_cache = False

    lora_config = LoraConfig(
        r=hp.lora_r,
        lora_alpha=hp.lora_alpha,
        lora_dropout=hp.lora_dropout,
        bias="none",
        task_type="CAUSAL_LM",
        # Standard attention + MLP target modules for the Llama/Mistral
        # architecture family — covers both without changes.
        target_modules=[
            "q_proj", "k_proj", "v_proj", "o_proj",
            "gate_proj", "up_proj", "down_proj",
        ],
    )
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    raw_dataset = load_dataset("json", data_files=args.dataset, split="train")

    def format_example(example: dict) -> dict:
        # apply_chat_template renders the full system/user/assistant
        # exchange using the base model's own chat format, so the
        # fine-tune sees exactly the prompt shape it will be served
        # with once it's behind vLLM in Week 7.
        text = tokenizer.apply_chat_template(example["messages"], tokenize=False)
        return {"text": text}

    formatted_dataset = raw_dataset.map(format_example, remove_columns=raw_dataset.column_names)

    collator = DataCollatorForCompletionOnlyLM(
        response_template=args.response_template, tokenizer=tokenizer
    )

    sft_config = SFTConfig(
        output_dir=args.output_dir,
        num_train_epochs=hp.epochs,
        per_device_train_batch_size=hp.per_device_batch_size,
        gradient_accumulation_steps=hp.gradient_accumulation_steps,
        learning_rate=hp.learning_rate,
        bf16=True,
        logging_steps=5,
        save_strategy="epoch",
        dataset_text_field="text",
        max_seq_length=4096,
        packing=False,
    )

    trainer = SFTTrainer(
        model=model,
        args=sft_config,
        train_dataset=formatted_dataset,
        data_collator=collator,
        tokenizer=tokenizer,
    )

    train_result = trainer.train()

    adapter_path = str(Path(args.output_dir) / "final_adapter")
    trainer.model.save_pretrained(adapter_path)
    tokenizer.save_pretrained(adapter_path)

    metadata = {
        "dataset_version": dataset_version,
        "base_model": args.base_model,
        "hyperparams": asdict(hp),
        "adapter_path": adapter_path,
        "status": "completed",
        "notes": f"final train_loss={train_result.training_loss:.4f}",
    }

    metadata_path = Path(args.output_dir) / "training_run_metadata.json"
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"Adapter saved to {adapter_path}")
    print(f"Run metadata saved to {metadata_path}")
    print(f"Register it with: python ../backend/scripts/record_finetune_run.py {metadata_path}")


if __name__ == "__main__":
    main()