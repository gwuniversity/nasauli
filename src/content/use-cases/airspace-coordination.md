---
code: UC-07
order: 7
title: Secure and Fair Airspace Coordination
summary: Coordinating flight plans, sequencing, and resources among self-interested operators without a single point of failure.
threat: Compromised coordinators, strategic misreporting, collusion, and spoofed arrival information.
teams: [purdue, ut-austin, vanderbilt]
challenges: [TC2, TC3]
tasks: ['2.1', '2.3', '3.1']
highlights:
  - { value: '76.8%', label: 'reduction in sector overload under reduced capacity with minimal cooperation, on European traffic data', team: ut-austin }
  - { value: '0', label: 'median optimality gap of the TACo auction versus the centralized solution in waypoint merging', team: ut-austin }
  - { value: '30–35%', label: 'lower coordination cost at vertiports with chance-constrained recommendations', team: ut-austin }
---

## The problem

Strategic coordination in UTM, deciding whose flight plan is approved, who lands first, and how shared resources are
allocated, involves operators who compete with each other. A central coordinator that must know everyone's
private costs is both a privacy liability and a single point of failure. And participants may misreport, collude,
or have their information spoofed.

## Our approach

- **No trusted center required.** Purdue developed decentralized learning algorithms for leader-follower games in
  which operators reach a stable, efficient operating point from their own observations, with no one able to
  stall the system by withholding information.
- **Agreement without disclosure.** UT Austin's Trading Auction for Consensus lets aircraft agree on a
  safety-feasible arrival sequence without revealing private valuations, and game-theoretic coordination relieves
  sector overload at scale.
- **Robust to untrusted information.** UT Austin formulates vertiport sequencing that stays robust when reported
  arrival times may be strategically misreported or spoofed. Purdue detects collusion purely from observed actions.
- **Fair by design.** Purdue's fair multi-user dueling bandits learn operator preferences online for strategic
  deconfliction, as an alternative to first-come, first-served.
- **Distributed approval.** Vanderbilt explored hashgraph-based consensus so mutually distrusting operators can
  agree on approved flight plans without a central authority.

## Looking ahead

Purdue is designing a UTM use case for fair strategic conflict resolution, and the auction protocols are being
extended with convergence guarantees.
