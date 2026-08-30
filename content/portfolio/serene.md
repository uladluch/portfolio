---
title: Serene
slug: serene
headline: "Turned a generic horoscope app into a $2M ARR lifestyle brand through a rebrand and a web2app funnel"
company: "Kiss My Apps"
companyUrl: "https://www.kissmyapps.com"
role: "Led product design and growth, end-to-end"
period: "2021–2023"
summary: "Rebranded a generic horoscope app into a $2M ARR lifestyle brand, lifting its iOS rating from poor to 4.7★ along the way."
tldr: "Serene was one of several interchangeable horoscope apps running the same paid-traffic playbook. Over two years I rebranded it into a lifestyle product aimed at women and LGBTQ+ users — white UI, serif type, Pinterest-collage styling — and built the growth engine around it: a web quiz that sold the subscription before the install. It reached $2M ARR, 42% of leads through that funnel, and a 4.7★ iOS rating."
status: draft
metrics:
  - label: "Scaled revenue to $2M ARR"
    value: 2000000
    kind: revenue
  - label: "Captured 42% of leads via web2app"
    value: 42
    kind: other
  - label: "Lifted iOS rating from poor to 4.7★"
    value: 4.7
    kind: rating
platform: [iOS, Android]
category: LifestyleApplication
links:
  - label: "App Store"
    url: "https://apps.apple.com/us/app/serene-talk-to-astrologer/id1178444023"
  - label: "Google Play"
    url: "https://play.google.com/store/apps/details?id=astrology.daily.horoscope&hl=en"
  - label: "Web2App"
    url: "https://quiz.appserene.co/place-of-birth"
cover: cover.webp
related: [calorie-counter, stream-vision-2]
aiUse: ""

# --- matching (invisible on the page; classification only) ---
tier: flagship
skills: [product design, growth design, brand identity, web2app funnels, subscription monetization]
industry: [wellness, lifestyle, astrology]
audience: b2c
role-type: end-to-end    # teaser says "Led the end-to-end transformation" — confirm at interview
keywords: [arr, ltv, brand pivot, acquisition funnel, viral growth, paywall]
---

## Context

Serene started as Astro, one of several interchangeable horoscope apps I
was already building at Kiss My Apps — the same UA-funnel playbook every
app in the category ran: buy paid traffic, hook on a generic daily
horoscope, hope retention held long enough to be profitable. It worked,
but it was a commodity. Nothing about the product itself pulled anyone
back, and the whole business depended on paid acquisition staying cheap.

## The problem

By 2021 the company wanted an app that behaved like a brand, not a funnel
— something with pull independent of ad spend. The numbers pointed at a
niche most horoscope apps ignored: women and LGBTQ+ users who wanted
astrology as a lifestyle and compatibility lens, not a fortune-cookie
push notification. Astro's generic UI and voice had nothing to say to
that audience — there was no product to point at and say "this is who
it's for."

## A brand, not a funnel

The rebrand cut dark mode entirely — a white UI, serif display type, and
collage-style imagery styled after what was trending on Pinterest and
Instagram moodboards at the time. The bet was aesthetic, not functional:
Gen Z was visibly gravitating toward that collage look, and none of the
generic horoscope apps, Astro included, were touching it.

<div class="compare">
  <figure class="figure compare__item">
    <p class="compare__label">Before — Astro</p>
    <div class="figure__media" style="--ar: 9 / 19.5">
      <p class="figure__brief">Astro's generic, dark-mode horoscope UI — a representative home/daily-horoscope screen from before the rebrand.</p>
      <span class="figure__id">placeholder:astro-before-screen</span>
    </div>
  </figure>
  <figure class="figure compare__item">
    <p class="compare__label">After — Serene</p>
    <div class="figure__media" style="--ar: 9 / 19.5">
      <p class="figure__brief">Serene's rebranded white UI, serif type, and Pinterest-collage styling. Figma: Serene iOS / Screens / 1. Onboarding / 1.1 Welcome (or another hero onboarding screen that reads the new identity clearly).</p>
      <span class="figure__id">placeholder:serene-rebrand-hero</span>
    </div>
  </figure>
</div>

## Talk to an astrologer, then pay

The AI astrologer chat became the paywall moment. The mechanic was to
pull the user into an actual back-and-forth exchange with the bot before
ever mentioning a subscription, then gate the reading right as they were
mid-conversation, waiting for an answer. It converted well. It's also the
exact pattern App Store reviewers call out as pushy — asked to pay
mid-compatibility-check, before seeing any real value. Both are true at
once: it worked, and it's the app's most consistent complaint.

![The AI astrologer chat mid-conversation, right before the report/reading is gated behind the paywall. Figma: Serene iOS / Screens / Astrologers v2 / 9.0.0 - Astrologers — report flow start](placeholder:astrologer-chat-paywall "9:19.5")

## Web2app: paying before the install

The growth engine sat entirely outside the app: a long onboarding quiz —
birth date, birth place, relationship questions — hosted on the web, with
encouraging copy at nearly every step telling the user their life was
about to get better, to keep completion high through a genuinely long
data-collection flow. It ended in a personalized report gated by a
subscription paywall, charged on the web, before the user ever opened the
native app — so that revenue never went through Apple's or Google's cut.
By the end of the project this funnel was bringing in 42% of leads.

![A step from the web2app onboarding quiz (quiz.appserene.co) — birth-data collection with the encouraging step copy. Screenshot of the live web funnel, not a Figma export.](placeholder:web2app-quiz-step "16:9")

## Affirmations that didn't land, at first

Not every bet worked on the first try. The Affirmation Challenge flow
didn't land with users when it first shipped — engagement was weak enough
that it needed a real rebuild, not a tweak. We rebuilt it as a gamified
challenge over a few iterations, and by version 3 it was lifting Day-7
retention.

![The gamified Affirmation Challenge, version 3. Figma: Serene Android / Screens / 9. Affirmation / Affirmations. (An earlier, ungamified v1 screen would make this a stronger before/after — check whether one survived in Figma's version history.)](placeholder:affirmations-v3 "9:19.5")

## Outcome

By the end of the project, Serene had grown into a $2M ARR product. Its
iOS rating climbed from poor to 4.7★ — a direct result of the redesign,
not a number the rebrand happened to inherit. And 42% of its leads were
coming through the web2app funnel, converting to paying subscribers
before a dollar went through Apple's or Google's cut.

## Working with Kiss My Apps

> I worked with Ulad for 3 years at KissMyApps and during this time we
> implemented many interesting projects. It was a pleasure to work with
> Ulad in the same team. His vision and understanding of product design
> has helped us progress and grow as a company.
>
> — **Kirill Ganziienko**, Delivery Manager, Kiss My Apps

## What I'd change now

Android was always the afterthought — it rode along on whatever shipped
for iOS, rarely got its own testing, and it shows: it never matched
iOS's performance or rating. If I were doing this again, Android would
get its own experiment budget instead of inheriting iOS's leftovers.
