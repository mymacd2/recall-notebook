---
title: "Bayes' Theorem"
prompt: "State Bayes' theorem. What does each term mean, and when is it useful?"
tags: [probability, statistics, bayesian-inference]
sources:
  - "Jaynes, E.T. (2003). Probability Theory: The Logic of Science. Cambridge University Press."
  - "https://en.wikipedia.org/wiki/Bayes%27_theorem"
date_created: 2026-04-17
date_modified: 2026-04-17
---

Bayes' theorem describes how to update a prior belief given new evidence:

$$P(A \mid B) = \frac{P(B \mid A)\, P(A)}{P(B)}$$

where:
- $P(A \mid B)$ — **posterior**: probability of $A$ given we observed $B$
- $P(B \mid A)$ — **likelihood**: probability of observing $B$ if $A$ is true
- $P(A)$ — **prior**: our belief in $A$ before observing $B$
- $P(B)$ — **marginal likelihood** (normalizing constant): total probability of $B$

### Intuition

The theorem formalizes how rational agents should update beliefs. The posterior is proportional to the likelihood times the prior:

$$P(A \mid B) \propto P(B \mid A)\, P(A)$$

### Example

A medical test for a rare disease ($1\%$ prevalence) has $99\%$ sensitivity and $95\%$ specificity. If a patient tests positive, what is the probability they actually have the disease?

Let $D$ = has disease, $T$ = tests positive.

$$P(D \mid T) = \frac{P(T \mid D)\, P(D)}{P(T)} = \frac{0.99 \times 0.01}{0.99 \times 0.01 + 0.05 \times 0.99} \approx 0.167$$

Despite a positive test, there is only a $\approx 16.7\%$ chance of actually having the disease — because the disease is rare (low prior).
