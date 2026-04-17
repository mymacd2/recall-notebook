---
title: "Central Limit Theorem"
prompt: "State the Central Limit Theorem. What conditions are needed and why does it matter?"
tags: [probability, statistics, distributions]
sources:
  - "Rice, J.A. (2006). Mathematical Statistics and Data Analysis, 3rd ed. Duxbury Press."
  - "https://en.wikipedia.org/wiki/Central_limit_theorem"
date_created: 2026-04-17
date_modified: 2026-04-17
---

Let $X_1, X_2, \ldots, X_n$ be i.i.d. random variables with mean $\mu$ and finite variance $\sigma^2$. Define the sample mean:

$$\bar{X}_n = \frac{1}{n} \sum_{i=1}^n X_i$$

Then as $n \to \infty$:

$$\frac{\bar{X}_n - \mu}{\sigma / \sqrt{n}} \xrightarrow{d} \mathcal{N}(0, 1)$$

Or equivalently, $\bar{X}_n \approx \mathcal{N}\!\left(\mu,\, \frac{\sigma^2}{n}\right)$ for large $n$.

### Conditions

1. **Independence** — the $X_i$ must be independent (or weakly dependent under more general versions)
2. **Identical distribution** — same distribution for all $X_i$ (the i.i.d. requirement can be relaxed via Lindeberg's condition)
3. **Finite variance** — $\sigma^2 < \infty$ is required; heavy-tailed distributions with infinite variance do not satisfy CLT (they converge to stable distributions instead)

### Why It Matters

The CLT justifies using the normal distribution for inference even when the underlying data is not normal — as long as the sample size is large enough. This is the theoretical basis for:
- Confidence intervals for means
- Z-tests and t-tests
- Many asymptotic results in statistics and ML

### Rule of Thumb

$n \geq 30$ is often cited, but the required $n$ depends on how non-normal the underlying distribution is. Heavily skewed distributions need larger $n$.
