# Advisor Roles

Contracts assign advisors to specific roles.

Roles determine commission distribution.

---

# Roles

The system supports the following roles:


CONSULTANT
KAM
MANAGER
SALES_DIRECTION
OPERATIONS
CEO
REFERRAL


---

# Role Meaning

CONSULTANT  
Advisor who brought the investor.

KAM  
Key Account Manager responsible for the relationship.

MANAGER  
Supervising manager.

SALES_DIRECTION  
Sales leadership.

OPERATIONS  
Operational support.

CEO  
Executive share.

REFERRAL  
External referral advisor.

---

# Role Distribution

Commission percentages are defined in the CommissionConfig matrix.

Example:


CONSULTANT → 33.25%
CEO → 48.45%
KAM → 5%


Percentages depend on the **investment source**.

---

# Commission Distribution Matrix

Commission percentages are distributed across advisor roles depending on the source of the investment.

| Role | COMUNIDAD | RED_CALIDA | DINERO_PROPIO | REFERIDORA |
|---|---|---|---|---|
| CONSULTANT | 33.25% | 52.25% | 76.71% | 31.50% |
| KAM | 5.00% | 5.00% | 5.00% | 5.00% |
| MANAGER | 4.75% | 4.75% | 4.04% | 4.50% |
| SALES_DIRECTION | 5.70% | 3.80% | 9.50% | 5.40% |
| OPERATIONS | 2.85% | 1.90% | 4.75% | 2.70% |
| CEO | 48.45% | 32.30% | 0.00% | 45.90% |
| REFERRAL | 0.00% | 0.00% | 0.00% | 5.00% |

The percentages always add up to 100% for each source.

The REFERRAL role only applies when the investment source is REFERIDORA.