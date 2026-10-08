---
code: UC-08
order: 8
title: Zero-Trust and Formally Assured Architecture
summary: Building drone software architectures with zero-trust patterns, and proving whether attacks are possible with a theorem prover.
threat: Vulnerabilities that propagate between untrusted components of drone and ground-station software.
teams: [collins, vanderbilt]
challenges: [TC3]
tasks: ['3.1', '3.2', '3.3']
---

## The problem

High-density urban airspace connects many ground control stations, aircraft, and service suppliers built by
different organizations. Security assessments of such systems are traditionally expert reasoning exercises: hard
to review, easy to leave undocumented, and costly to repeat whenever the architecture changes.

## Our approach

- **Zero-trust design patterns.** Collins Aerospace identified new zero-trust patterns for urban airspace (a
  zero-trust controller, public key infrastructure, a trusted cryptographic engine, and data-leak protection) and
  updated existing patterns, modeling them in the Architecture Analysis and Design Language (AADL).
- **Assessments you can re-run.** Collins and Vanderbilt are building a toolchain in which a large language model
  proposes candidate theorems about an architecture and the Lean theorem prover checks them. The result is a
  machine-checked, re-executable argument about whether a specific attack is possible.
- **From analysis to implementation.** The same architecture used for attack reasoning also guides deployment on
  the seL4 microkernel, so what is analyzed is what is built.
- **Explainable assurance.** Joint Vanderbilt–Collins work makes explicit why a design meets its requirements and
  why safety and security concerns are mitigated.

## Looking ahead

The team is growing a library of formalized attacks and defenses that supports security analysis across the
project’s use cases.
