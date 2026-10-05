---
code: UC-03
order: 3
title: Trustworthy Remote ID
summary: Detecting falsified Remote ID broadcasts from the physics of the radio signal, and planning safe paths around suspected spoofers.
threat: An aircraft broadcasting false position and velocity to hide its intent or manipulate nearby collision avoidance.
teams: [vanderbilt, ut-austin]
challenges: [TC1, TC2]
tasks: ['1.2', '1.3', '2.3', '3.3']
highlights:
  - { value: '~10×', label: 'fewer near mid-air collisions with spoofers at the highest traffic density tested, versus trusting all broadcasts', team: vanderbilt }
  - { value: '1,920', label: 'simulated urban scenarios used to compare spoofing detectors', team: vanderbilt }
  - { value: '3', label: 'independent physical checks on a broadcast: signal strength, Doppler shift, and angle of arrival', team: vanderbilt }
---

## The problem

FAA rules require drones to broadcast Remote ID, including their position and velocity, and nearby aircraft can
use those broadcasts to avoid each other. But the contents of a broadcast are only as honest as the sender. A
spoofed position could disguise malicious activity or trick neighbors into unsafe maneuvers.

## Our approach

The contents of a message can be forged; the physics of the radio signal that carries it is much harder to fake.

- **Detection from signal dynamics.** Vanderbilt built OMNeT++/INET simulation infrastructure and compared
  detectors that run onboard a single aircraft, federate measurements across receivers to localize the true
  transmitter, or learn from labeled data. Each trades accuracy against coordination and training cost.
- **Real radios.** A hardware testbed with a software-defined radio extends detection with Doppler shift and angle
  of arrival, so a spoofer that adjusts its power still produces a signature that contradicts its claimed track.
- **Spoofing-aware planning.** With UT Austin, Vanderbilt treats Remote ID as unverified: a suspected spoofer is
  localized under uncertainty, converted into a chance-constrained unsafe region, and avoided by decentralized
  trajectory planners.

## Looking ahead

Next steps fuse Doppler and angle-of-arrival measurements into localization and validate detection against
real-world RF environments.
