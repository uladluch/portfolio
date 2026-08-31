---
title: Serene
slug: serene
headline: "Turned a generic horoscope app into a $2M ARR lifestyle brand through a rebrand and a web2app funnel"
company: "Kiss My Apps"
companyUrl: "https://www.kissmyapps.com"
role: "Product & Growth Designer"
period: "2021–2023"
summary: "Rebranded a generic horoscope app into a $2M ARR lifestyle brand, lifting its iOS rating from poor to 4.7★ along the way."
tldr: "One of several interchangeable horoscope apps, rebuilt over two years into a lifestyle brand — and a web quiz that sold the subscription before the install. $2M ARR, 42% of leads through it, 4.7★ on iOS."
status: archived
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
brandColor: "#F7F2FF"   # one colour; brand-palette.py derives the ramp
cover: cover.webp
related: []
aiUse: ""

# --- matching (invisible on the page; classification only) ---
tier: archive
skills: [product design, growth design, brand identity, web2app funnels, subscription monetization]
industry: [wellness, lifestyle, astrology]
audience: b2c
role-type: end-to-end
keywords: [arr, ltv, brand pivot, acquisition funnel, viral growth, paywall]
---

<!-- ARCHIVED 2026-08-31. Pulled from the home page and unpublished while the
     portfolio narrows to two cases done properly: Calorie Counter and Stream
     Vision II. Nothing here is deleted — the draft, its composition spec and
     its rendered figures all stand, and the open work is recorded in
     references/compose-plan.md: no Astro screenshots for the before/after,
     and a second interview needed for the depth the draft does not have. -->

## Context

Serene started as Astro, one of several interchangeable horoscope apps I
was already building at Kiss My Apps — the same UA-funnel playbook every
app in the category ran: buy paid traffic, hook on a generic daily
horoscope, hope retention held long enough to be profitable. It worked,
but it was a commodity. Nothing about the product itself pulled anyone
back, and the whole business depended on paid acquisition staying cheap.

![Astro before the rebrand — one screen of its home or daily-horoscope surface, dark-mode and generic, the commodity this started as.](placeholder:astro-before-screen "4:3")

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

![Serene's home screen after the rebrand: a serif headline over the day's reading, compatibility rings for love, health and career, and an editorial layout on white.](serene-rebrand-hero.webp "4:3")

## Talk to an astrologer, then pay

The AI astrologer chat became the paywall moment. The mechanic was to
pull the user into an actual back-and-forth exchange with the bot before
ever mentioning a subscription, then gate the reading right as they were
mid-conversation, waiting for an answer. It converted well. It's also the
exact pattern App Store reviewers call out as pushy — asked to pay
mid-compatibility-check, before seeing any real value. Both are true at
once: it worked, and it's the app's most consistent complaint.

![The chat in three steps: a question being typed, the same question sent and waiting, and the answer arriving with a $19.99 price attached to it.](astrologer-chat-paywall.webp "4:3")

## Web2app: paying before the install

The growth engine sat entirely outside the app: a long onboarding quiz —
birth date, birth place, relationship questions — hosted on the web, with
encouraging copy at nearly every step telling the user their life was
about to get better, to keep completion high through a genuinely long
data-collection flow. It ended in a personalized report gated by a
subscription paywall, charged on the web, before the user ever opened the
native app — so that revenue never went through Apple's or Google's cut.
By the end of the project this funnel was bringing in 42% of leads.

![Four steps of the funnel: question 1 of 7, question 3 of 7, a congratulations screen granting 50% off, and the subscription paywall — all before the app is installed.](web2app-quiz-step.webp "4:3")

## Affirmations that didn't land, at first

Not every bet worked on the first try. The Affirmation Challenge flow
didn't land with users when it first shipped — engagement was weak enough
that it needed a real rebuild, not a tweak. We rebuilt it as a gamified
challenge over a few iterations, and by version 3 it was lifting Day-7
retention.

![The rebuilt challenge across its run: an empty seven-day tracker, day one part-completed, and all seven days closed with a Share Result button.](affirmations-v3.webp "4:3")

## Outcome

By the end of the project, Serene had grown into a $2M ARR product. Its
iOS rating climbed from poor to 4.7★ — a direct result of the redesign,
not a number the rebrand happened to inherit. And 42% of its leads were
coming through the web2app funnel, converting to paying subscribers
before a dollar went through Apple's or Google's cut.

<figure class="figure carousel">
  <div class="figure__media carousel__stage" style="--ar: 4 / 3">
    <img class="carousel__slide is-active" src="../../assets/projects/serene/outcome-feed.webp" alt="The daily feed: a serif headline over the day's reading, with compatibility rings beneath it." />
    <img class="carousel__slide" src="../../assets/projects/serene/outcome-compatibility.webp" alt="A compatibility result between two people." />
    <img class="carousel__slide" src="../../assets/projects/serene/outcome-transits.webp" alt="Transits, with countdowns against each current theme." />
    <img class="carousel__slide" src="../../assets/projects/serene/outcome-astrologers.webp" alt="The astrologer threads a paid question lives in." />
  </div>
  <div class="carousel__thumbs" role="tablist" aria-label="Choose a screen">
    <button class="carousel__thumb" role="tab" aria-selected="true" type="button"><img src="../../assets/projects/serene/outcome-feed.webp" alt="Daily feed" /></button>
    <button class="carousel__thumb" role="tab" aria-selected="false" type="button"><img src="../../assets/projects/serene/outcome-compatibility.webp" alt="Compatibility" /></button>
    <button class="carousel__thumb" role="tab" aria-selected="false" type="button"><img src="../../assets/projects/serene/outcome-transits.webp" alt="Transits" /></button>
    <button class="carousel__thumb" role="tab" aria-selected="false" type="button"><img src="../../assets/projects/serene/outcome-astrologers.webp" alt="Astrologers" /></button>
  </div>
</figure>

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

![Android's onboarding, which stayed dark purple while iOS moved to white and serif — the gap between the two platforms is visible without arguing it.](android-afterthought.webp "4:3")
