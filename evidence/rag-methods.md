# Reproduce the RAG benchmark

The submission contains measured predictions and reports. `source/` contains
all code, input data, pinned package versions and model commit revisions.
No API key is needed. Downloaded model weights are excluded from the ZIP.

## From the extracted submission directory

```sh
cd source
python3.12 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python download_models.py
.venv/bin/python -m unittest test_chunking.py
.venv/bin/python run_experiment.py --repeats 3
.venv/bin/python evaluate.py
```

Generated reports are written to `source/submission/`; they do not overwrite
this archived run. Generation and retrieval run offline after the downloads.
`--smoke --repeats 1` runs one question with retrieval, reranking and no-RAG,
writing to `smoke_output/`. The full run performs 702 inference requests.

For validation of the archived results, from the extracted submission directory:

```sh
python3 source/validate_submission.py .
```

## Methods and report schemas

- `predictions.jsonl`: exactly one answer per configuration and question,
  with the IDs of passages actually supplied to generation.
- `costs.json`: maps each configuration to `cost_per_task` (USD per question),
  `p50_ms` and `p99_ms` (54 warm wall-clock measurements per configuration).
- `trials.jsonl`: all 702 measured requests, including repetition index,
  end-to-end/retrieval/generation timing, candidate IDs, reranker scores,
  and prompt token count. Answers are checked for repeat consistency.
- `retrieval_bench.json`: local accuracy, keyword accuracy, recall@3, MRR@3,
  paired wins/losses/ties against no-RAG, full per-question assessment, and
  the manually transcribed corpus references used only by the evaluator.
- `run_metadata.json`: exact models/revisions, decoding settings, prompt,
  machine and package information, chunk hashes, offline index-build timing,
  source hashes, timing boundaries, and seeded randomized request order.
- `ANALYSIS.md`: one paragraph explaining the observed winner and limitations.

The course's expected answers and grader were not distributed. Local accuracy
is an independently implemented check, not an official course score. Numeric
answers must contain the required number without conflicting numbers; feature
answers must contain the expected plan without naming a competing plan.

All models run on CPU with four PyTorch threads. Model loading, warmup and
index construction are excluded from request latency and documented separately.
All 13 configurations use FLAN-T5-base, greedy decoding, one beam, a 48-token
output limit, and the same prompt template. The baseline receives `(none)` as
context and still invokes the model; it is not a hardcoded abstention.
The timing samples are descriptive. A 54-sample p99 is close to the maximum,
not a reliable estimate of production tail latency. Small differences between
identical chunk configurations should not be interpreted causally.

BGE uses the query instruction recommended in its model card. All vectors are
normalized and searched by dot product; the top eight candidates are either
reranked with the required cross-encoder or left in embedding-score order.
The top three passages are supplied to the generator in that order. No
question-specific retrieval rules or reference answers enter the pipeline.

Model references:
- https://huggingface.co/google/flan-t5-base
- https://huggingface.co/BAAI/bge-small-en-v1.5
- https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2
- https://huggingface.co/cross-encoder/ms-marco-MiniLM-L-6-v2
