---
code: UC-01
order: 1
title: Vision-Based Delivery and Landing
summary: Making camera- and AI-based package delivery and precision landing trustworthy, even when the scene below can be manipulated.
threat: Physical adversarial objects, tampered landing markers, and injected visual text that mislead onboard perception.
teams: [gwu, uc-irvine, tsu]
challenges: [TC1, TC2]
tasks: ['1.1', '1.2', '2.2']
highlights:
  - { value: '8–12 m', label: 'mean touchdown error induced by MirageMarker, versus 0.03 m on clean markers', team: uc-irvine }
  - { value: 'NDSS 2026', label: 'FlyTrap: the first security analysis of camera-based autonomous target tracking', team: uc-irvine }
  - { value: '20,000+', label: 'synthetic RGB and LiDAR scenes in the IRIS D³ drone-delivery dataset', team: tsu }
---

## The problem

Delivery drones increasingly rely on cameras and learned perception for the final, most delicate part of the
mission: finding a safe spot to land or lower a package, and following or tracking objects on the ground. Unlike
GPS, a camera sees the world directly. That also means anyone who can change what the camera sees can influence
the aircraft.

## Our approach

GWU, UC Irvine, and TSU work this use case together in a bi-weekly subteam, combining attack discovery with
defenses and shared data.

- **Understanding the vulnerabilities.** UC Irvine performed the first security analyses of camera-based
  autonomous target tracking (FlyTrap) and of fiducial-marker pose estimation used for precision landing
  (MirageMarker), showing that small, physically realizable changes in the scene can steer a drone's behavior while
  evading standard filtering.
- **Trustworthy perception for delivery.** GWU benchmarked real-time detectors for safe landing with calibrated
  uncertainty, used vision-language models to identify and explain safe landing zones, and is developing a
  calibrated forecast of how long a drop zone will stay clear during tethered delivery.
- **Shared data at scale.** TSU's IRIS D³ dataset simulates clean, degraded, occluded, and compromised drop
  zones in RGB and LiDAR, supporting cross-institution benchmarking of landing models.
- **Securing AI reasoning onboard.** UC Irvine has begun work on defending vision-language models used in drone
  autonomy against visual prompt injection.

## Looking ahead

Year 3 brings these pieces into joint demonstrations of vision-based delivery that can recognize, and recover
from, a manipulated scene.
