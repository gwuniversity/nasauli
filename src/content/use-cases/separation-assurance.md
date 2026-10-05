---
code: UC-02
order: 2
title: Separation Assurance in Shared Airspace
summary: Keeping drones from multiple operators safely apart when fleets, policies, and navigation data differ, or are corrupted.
threat: GPS/GNSS degradation and spoofing, and unsafe interactions among heterogeneous fleets and collision-avoidance policies.
teams: [gwu, purdue, ut-austin]
challenges: [TC2]
tasks: ['2.2', '2.3']
highlights:
  - { value: '~35%', label: 'GPS observation corruption tolerated with near-zero near mid-air collisions by the robust policy', team: gwu }
  - { value: '~90%', label: 'fewer near mid-air collisions with runtime observation filtering under GNSS degradation', team: gwu }
  - { value: '27% → 88%', label: 'decision accuracy of a fine-tuned language model acting as a deconfliction policy', team: gwu }
---

## The problem

In a busy city, several delivery companies may operate fleets with different aircraft, sensing ranges, and
collision-avoidance logic in the same airspace. Every one of those tactical decisions depends on knowing where
each aircraft is, and that knowledge comes from GPS, which can be degraded or spoofed.

## Our approach

- **Mixed fleets, shared sky.** GWU and Purdue examined whether independently trained deconfliction policies from
  different companies converge to safe co-existence in a simulated delivery network over Frisco, Texas, in the
  Dallas area, and whether the outcome is fair to operators with less
  capable aircraft. Policies converged and collisions fell sharply, but stronger fleets were systematically favored.
- **Robust to corrupted GPS.** GWU and UT Austin model GPS corruption as a game between aircraft and a spoofer,
  derive a closed-form worst-case perturbation for efficient adversarial training, and add runtime safety filtering
  that corrects the observation the policy sees.
- **Language models as interpretable policies.** GWU built a simulation-to-language pipeline in the BlueSky
  simulator and fine-tuned an open language model to make tactical deconfliction decisions, reducing near mid-air
  collisions and raising mission completion in closed-loop tests.

## Looking ahead

Ongoing work addresses inference latency, formal safety assurance, and benchmarking against rule-based and
reinforcement-learning baselines, with demonstrations planned for Year 3.
