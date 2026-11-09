# AIShop



## Platform

web

## Users

Shoppers browse laptops, phones, headphones, keyboards and mice. Administrators maintain products, stock and order statuses, and inspect customer accounts. These roles are observed in the existing application; no demographic segment is assumed.

## Product Purpose

An electronics store with a catalog-aware AI shopping assistant and a matching administration workspace. The current work improves the existing frontend, preserving its behavior and backend contracts.

## Operating Context

Existing React/Vite application with a Spring Boot backend. Local preview may explicitly use browser-local mock data; API mode uses actual authenticated service calls. Browser preview and automated frontend checks do not certify production payments or live database behavior.

## Capabilities and Constraints

- Prices use KM, with decimal comma and thousands separator. Interface language is Bosnian.
- Five existing catalog categories; IDs come from actual service data.
- Product create/edit/delete, stock management, order status transitions and customer inspection already exist.
- Customer role changes and arbitrary category changes are outside current frontend support.
- AI cart modifications require explicit confirmation through the existing flow.
- Preserve user-authored Stripe work, authentication behavior and service contracts.
- Never present generic illustrative photos as verified photographs of the named model. Current Unsplash images are illustrative.
- Shipping, payments and deployment guarantees must not be invented.

## Brand Commitments

The user explicitly selected a monochrome technology-store theme for both the storefront and admin. Preserve the AIShop name and supplied logo. The storefront reference is the shared ecommerce community kit; admin structure follows the approved AdminLTE-inspired composition. This is refinement of the implemented system, not a replacement visual identity.

## Evidence on Hand

Existing frontend routes, translations, service schemas, backend controllers, seed catalog and automated tests. User-approved Figma admin concept and supplied ecommerce visual reference. Exact manufacturer photography, verified testimonials and production service guarantees have not been supplied.

## Product Principles

1. Real data and truthful states before decoration.
2. Make product comparison and order work quick on small and large screens.
3. Keep browsing, account and administration vocabulary consistent.
4. Protect existing authentication, cart, order and payment behavior during visual changes.

## Open Decisions

Production shipping policy and verified manufacturer imagery remain unspecified. Specific accessibility certification and supported browser matrix have not been requested; keyboard, naming, contrast and responsive usability remain implementation quality requirements.
