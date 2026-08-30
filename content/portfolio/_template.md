---
# Case study source. The build (tools/build.js) generates the HTML page,
# JSON-LD, md twin, llms.txt entry and sitemap row from this one file.
# Authored via the case-study skill (interview); publish flow: llm-pages.
title: ""
slug: ""
headline: ""             # the H1 sentence: product + your move + the number it moved
company: ""
companyUrl: ""           # company name links out to this in Project Details
role: ""                 # ONE short line — no em-dash enumeration of sub-duties, those go in the body
period: ""
summary: ""               # max 160 chars (hard limit); home card, meta description, llms.txt.
                           # No separate Impact row in Project Details — fold the number in here.
tldr: ""                  # optional; the page's TL;DR block. A few sentences, under ~500 chars.
                           # Falls back to summary when omitted.
status: draft            # draft | ready — build publishes only ready
metrics:                 # not shown in Project Details; feeds JSON-LD rating + llms.txt only
  - label: ""
    value:
    kind: other          # revenue | rating | retention | dau | other
platform: []
category: ""             # schema.org applicationCategory
links:                   # free-form — as many as apply, in display order
  - label: ""            # e.g. "App Store", "Figma", "Case study video"
    url: ""
cover: cover.webp
related: []
aiUse: ""

# --- matching: never rendered on the page; read only when targeting a
# --- vacancy (pick 3, order, adjust About). Public in the repo — keep the
# --- values innocuous classification, never strategy notes.
tier: archive            # flagship | archive — flagships are the 3 shown on the site
skills: []               # what the work demonstrates, e.g. [product design, growth, swiftui]
industry: []             # where, e.g. [wellness, fintech, hardware]
audience: b2c            # b2c | b2b | hardware-companion | internal
role-type: end-to-end    # end-to-end | led | contributed — honest ownership level
keywords: []             # the words vacancies use, e.g. [paywall, aso, ltv]
---

## Context

## The problem

## Decisions

## Outcome

## What I'd change now
