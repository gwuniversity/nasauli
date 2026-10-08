---
code: UC-05
order: 5
title: Command-and-Control Link Security
summary: Evaluating and hardening the MAVLink link between ground control stations and drones, and detecting hijacked vehicles.
threat: Interception, command injection, and telemetry spoofing on unauthenticated control links.
teams: [nvcc, vanderbilt, gwu, collins]
challenges: [TC1, TC3]
tasks: ['1.1', '1.3', '3.3']
highlights:
  - { value: '18 drones', label: 'in a communication-constrained fleet where graph learning detects compromised members', team: vanderbilt }
---

## The problem

Most small drones talk to their ground control station over MAVLink, an open protocol for telemetry, missions,
and commands. In its default configuration it is neither authenticated nor encrypted, so the command uplink and
telemetry downlink are exposed.

## Our approach

- **Testing the link.** In software-in-the-loop testbeds, NVCC research interns working at GWU evaluated the
  control link and measured the effect of standard mitigations. MAVLink 2 message signing blocked injected
  commands, but telemetry remained readable without encryption or a secure tunnel.
- **An independent check from traffic management.** The 2026 interns built GridEye, a read-only UTM monitor that
  tracks a simulated delivery fleet and enforces flight boundaries, no-fly zones, and altitude limits, offering a
  second, independent view of where aircraft really are.
- **Detecting hijacked vehicles.** Vanderbilt generates attack datasets from its networked UAV simulator and
  develops learning-based detectors, including graph methods that spot a compromised drone by comparing it with
  its neighbors under tight communication budgets.
- **Hardening by design.** Collins Aerospace’s zero-trust patterns include public key infrastructure and secure
  channels for MAVLink.

## Looking ahead

Year 3 integrates detection with the networked simulator and zero-trust patterns into end-to-end demonstrations.
