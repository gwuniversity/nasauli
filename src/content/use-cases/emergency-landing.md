---
code: UC-06
order: 6
title: Resilient eVTOL Emergency Landing
summary: Selecting and tracking a safe landing zone with onboard sensing when an air taxi is impaired by a cyber-physical attack.
threat: Attacks that degrade navigation or flight capability over a dense urban environment.
teams: [tsu]
challenges: [TC2]
tasks: ['2.2']
highlights:
  - { value: '~91%', label: 'safe-landing detection accuracy of the multimodal framework, evaluated on 5,000+ samples', team: tsu }
  - { value: '18,000+', label: 'aerial images in TSU’s landing-zone dataset archive', team: tsu }
---

## The problem

If a cyberattack impairs an air taxi over a city, the aircraft may need to find somewhere safe to land, quickly,
using whatever sensing still works. Urban terrain is crowded with buildings, vehicles, and people, and conditions
change with light and weather.

## Our approach

TSU developed IRIS, a physics-based simulation environment with detailed downtown, suburban, vertiport, and
airport scenes, eVTOL and drone models, and simulated sensors including RGB and infrared cameras, LiDAR, GPS, and
inertial units, under fog, rain, snow, dust, and night conditions.

On this foundation, TSU built a multi-hypothesis emergency landing framework:

- **Candidate generation** from aerial imagery using image processing and learned models.
- **Validation with independent evidence:** for each candidate, simulated LiDAR checks planarity, slope,
  roughness, obstacle clearance, and usable footprint.
- **Ranking and tracking:** multi-criteria scoring and Kalman-filter tracking keep a stable target during descent,
  with continuous revalidation and human-in-the-loop review.

The framework was published at SPIE Defense + Security 2026.

## Looking ahead

Interfaces to path planning, descent guidance, and flight control prepare the framework for closed-loop
demonstration.
