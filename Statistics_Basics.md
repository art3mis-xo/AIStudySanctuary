# Statistics Essentials: A Concise Guide

## 1. Correlation vs. Causation
One of the most common pitfalls in data science is assuming that because two variables move together (correlation), one must be causing the other (causation). 

**Example:** Ice cream sales and drowning incidents are highly correlated. This does not mean ice cream causes drowning. Instead, a "Lurking Variable"—hot weather—causes both to increase.

## 2. The P-Value and Significance
In hypothesis testing, the **p-value** measures the probability that the observed results occurred by random chance. 
*   **p < 0.05:** Generally considered "statistically significant" (low probability of being a fluke).
*   **p > 0.05:** Fails to reject the null hypothesis.

## 3. The Central Limit Theorem (CLT)
The CLT states that regardless of the original distribution of the data, the distribution of the *sample means* will approach a normal distribution as the sample size increases. This is the foundation for most parametric statistical tests.

## 4. Normal Distribution Characteristics
*   **Symmetry:** Mean, Median, and Mode are all equal at the center.
*   **68-95-99.7 Rule:** 68% of data falls within 1 standard deviation, 95% within 2, and 99.7% within 3.
