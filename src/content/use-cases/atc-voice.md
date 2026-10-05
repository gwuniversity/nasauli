---
code: UC-04
order: 4
title: Air Traffic Control Voice Integrity
summary: Assessing how convincingly AI speech synthesis can imitate controller instructions, to inform procedural and technical defenses.
threat: Synthetic controller voices delivering unauthorized instructions over voice radio.
teams: [gwu]
challenges: [TC1]
tasks: ['1.1', '1.2']
highlights:
  - { value: '1,000', label: 'controller utterances in a multidimensional evaluation of synthetic ATC speech', team: gwu }
  - { value: '3.9%', label: 'recognizer word error rate on synthetic speech, showing instruction content survives synthesis', team: gwu }
---

## The problem

Even as automation grows, air taxis and other aircraft will continue to rely on voice communication with air
traffic control. Modern text-to-speech models can produce convincing speech from short voice samples. A small
change to an altitude, heading, or frequency in an instruction could alter its operational meaning entirely.

## Our approach

GWU developed an evaluation framework that measures synthetic controller speech along several dimensions:
recovery of the instruction content, resemblance to the original speaker, spectral characteristics, and
procedural cadence. The study found that instruction content can be recovered very accurately even when pitch and
timing still differ from real controllers.

The study deliberately does not test pilot acceptance. Its purpose is to provide acoustic evidence for assessing
risk, and to inform defenses.

## Looking ahead

Pilot readback and controller hearback already give opportunities to catch an unauthorized
instruction. The next priority is studying how synthetic speech interacts with these procedural defenses.
