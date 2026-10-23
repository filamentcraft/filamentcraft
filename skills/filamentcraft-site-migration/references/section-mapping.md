# Mapping source blocks to sections

## Contents
- How to choose
- Source pattern → section
- Platform aliases (Gutenberg, Elementor, Shopify, Webflow, Squarespace)
- Built-in catalog: copy fields, options, blocks per section

Run `php artisan filamentcraft:sections <slug>` for the exact, installed schema. The catalog at the end of this file is a planning aid generated from it and can drift between versions.

## How to choose

1. Name the block's **role** (what it does for the visitor), not its looks: introduce, prove, list benefits, explain steps, show work, quote customers, price, answer questions, capture a lead, close.
2. Pick the built-in with that role. Layout options (`layout`, `columns`, `media_mode`, `align`, `shape`, `density`, `content_align`) usually cover the visual variant. Set them by looking at the section screenshot.
3. Repeated children with the same structure become that section's **blocks**.
4. Split a source block that does two jobs (a hero with a logo row under it becomes `hero` plus `logo-cloud`). Merge tiny decorative separators into the neighbouring section.
5. If no role fits, or the layout is a signature design element the owner cares about, write a custom section (filamentcraft-sections skill).

## Source pattern → section

| Source pattern | Section | Notes |
|---|---|---|
| First block: big heading, subtext, buttons, maybe image or video | `hero` | `media_mode` none/background/start/end/below; `layout` spotlight/editorial/compact; up to 4 `proof` blocks for small facts |
| Shop opener with product imagery | `store-hero` | needs the Storefront adapter |
| Row of logos ("trusted by") | `logo-cloud` | `logo` blocks; scrolling ticker → `marquee` |
| 3–6 cards with icon/title/text | `features` | `feature` blocks |
| Big mosaic of mixed tiles | `bento` | |
| Image beside text (one) | `image-text` | |
| Alternating image/text rows | `showcase` | `row` blocks |
| Numbered "how it works" | `steps` | |
| Dated history or roadmap | `timeline` | |
| Big numbers with labels | `stats` | |
| Customer quotes | `testimonials` | `quote` blocks; layout cards/featured/compact/carousel/moving |
| Plans with prices | `pricing` | `plan` blocks |
| Feature-by-plan table | `comparison` | |
| Q&A accordion | `faq` | `item` blocks |
| People with photos | `team` | `member` blocks |
| Photo grid / lightbox | `gallery` | |
| Case studies / projects | `portfolio` | |
| Latest posts | `articles` | link cards to the posts |
| Long prose (about, policy, article body) | `rich-text` | `body` takes HTML |
| Tabbed content | `tabs` | |
| Embedded video | `video` | |
| Countdown to a date | `countdown` | |
| Addresses, hours, map | `locations` | |
| Closing call to action band | `cta` | |
| Email signup | `newsletter` | stored as submissions |
| Contact form (name, email, message) | `contact` | other fields: custom Livewire section, or keep the host's form |
| Thin announcement bar | `banner` (on the page) or the `announcement` region (site-wide) | |
| Sticky image with scrolling points | `sticky-reveal` | |
| Product screenshot that tilts on scroll | `scroll-showcase` | |
| Product grid, product page, categories, cart, checkout | `product-listing`, `product-detail`, `category-grid`, `cart`, `checkout`, `product-carousel` | catalog stays in host models |
| Site navigation | `header` region, `nav-link` blocks | |
| Footer columns | `footer` region, `link` blocks with a `column` name | |

## Platform aliases

| Platform block | Section |
|---|---|
| Gutenberg `cover` | `hero` (background media) |
| Gutenberg `media-text` | `image-text` |
| Gutenberg `columns` of icon/heading/text | `features` |
| Gutenberg `gallery` | `gallery` |
| Gutenberg `details` (repeated) | `faq` |
| Gutenberg `quote`/`pullquote` (repeated) | `testimonials` |
| Gutenberg `buttons` + heading at the end | `cta` |
| Elementor `heading`+`text-editor`+`button` first section | `hero` |
| Elementor `icon-box` repeated | `features` |
| Elementor `testimonial`/`testimonial-carousel` | `testimonials` |
| Elementor `price-table` | `pricing` |
| Elementor `accordion`/`toggle` | `faq` |
| Elementor `counter` | `stats` |
| Elementor `image-carousel`/`gallery` | `gallery` |
| Shopify `image-banner`/`slideshow` | `hero` |
| Shopify `multicolumn` | `features` |
| Shopify `image-with-text` | `image-text` |
| Shopify `collapsible-content` | `faq` |
| Shopify `featured-collection` | `product-carousel` |
| Shopify `collection-list` | `category-grid` |
| Shopify `main-product` | `product-detail` |
| Shopify `main-collection-product-grid` | `product-listing` |
| Shopify `rich-text` | `rich-text` (or `cta` when it ends with a button) |
| Shopify `newsletter` | `newsletter` |
| Shopify `video` | `video` |
| Webflow hero section + nav | `hero` + `header` region |
| Squarespace/Wix "gallery"/"summary" blocks | `gallery` / `articles` |

## Built-in catalog

"copy" lists the text, link and image fields to fill from the source (image and link fields are marked). "options" are layout and style choices; set them to match the screenshot. "blocks" are block type: fields.

### `cart`
shopping cart page body.

- copy: heading, continue_label, checkout_label, empty_title, empty_body, shipping_flat, free_threshold, payment_note
- options: density=compact|comfortable|airy

### `category-grid`
category tiles from the catalog.

- copy: eyebrow, heading, intro
- options: catalog (Select); columns=2|3|4; limit (number); density=compact|comfortable|airy

### `checkout`
checkout page body.

- copy: heading, subheading, place_label, cod_label, cod_help, payment_note, success_title, success_body, shipping_flat, free_threshold
- options: density=compact|comfortable|airy

### `product-carousel`
scrolling row of products from the catalog.

- copy: eyebrow, heading, intro, view_all_label, tag, brand
- options: catalog (Select); collection=featured|new|all|category; category (Select); limit (number); density=compact|comfortable|airy

### `product-detail`
single product page body.

- copy: back_label, add_label, related_heading
- options: catalog (Select); show_related (Toggle); preview_slug (Select); density=compact|comfortable|airy

### `product-listing`
filterable product grid from the catalog.

- copy: eyebrow, heading
- options: catalog (Select); show_filters (Toggle); show_price_filter (Toggle); columns=2|3|4; density=compact|comfortable|airy

### `store-hero`
commerce opener with product spotlight and shop CTA.

- copy: eyebrow, heading, subheading, primary_label, secondary_label, secondary_url (link), image (image), image_2 (image), image_3 (image)
- options: catalog (Select); layout=collage|split|banner; density=compact|comfortable|airy
- blocks: perk: icon, label

### `articles`
latest posts or news cards.

- copy: eyebrow, title, intro, view_all_label, view_all_url (link)
- options: layout=grid|featured; columns=2|3; show_meta (checkbox); show_tags (checkbox); align=start|center; shape=clean|contained|layered|wireframe; density=compact|comfortable|airy
- blocks: article: image (image), tag, title, excerpt, meta, url (link)

### `banner`
slim highlighted message bar.

- copy: text, cta_label, cta_url (link)
- options: icon (icon); style=bar|floating; tone=brand|surface; dismissible (checkbox)

### `bento`
mosaic of differently sized tiles for a handful of highlights.

- copy: eyebrow, title, intro
- options: align=start|center; density=compact|comfortable|airy
- blocks: tile: size, tone, icon, title, description, image (image), url (link)

### `comparison`
table comparing options or competitors.

- copy: eyebrow, title, intro, our_label, competitor_a_label, competitor_b_label, cta_label, cta_url (link)
- options: highlight_ours (checkbox); align=start|center; shape=clean|contained|layered|wireframe; density=compact|comfortable|airy
- blocks: row: feature, us, competitor_a, competitor_b

### `contact`
contact form with a short invitation.

- copy: heading, subheading, name_label, email_label, message_label, button_label, success_message
- options: density=compact|comfortable|airy

### `countdown`
launch or event countdown; needs a real date.

- copy: eyebrow, heading, subheading, cta_label, cta_url (link), expired_message
- options: target_date (DateTimePicker); show_labels (checkbox); align=start|center; shape=clean|contained|layered|wireframe; density=compact|comfortable|airy

### `cta`
short closing call to action with one button.

- copy: badge, heading, subheading, note, url (link), label
- options: layout=center|split|banner; align=start|center; shape=clean|contained|layered|wireframe; density=compact|comfortable|airy; backdrop=none|aurora|spotlight|spotlights|beams|meteors|grid|dots|lamp|stars; cta_style=default|moving-border|glow-border

### `faq`
questions and answers.

- copy: eyebrow, title, intro
- options: align=start|center; shape=clean|contained|layered|wireframe; density=compact|comfortable|airy
- blocks: item: question, answer

### `features`
benefit cards with icon, title and short description; needs three or more genuinely different things.

- copy: eyebrow, title, intro
- options: layout=cards|bands|minimal; columns=2|3|4; align=start|center; shape=clean|contained|layered|wireframe; density=compact|comfortable|airy; effect=none|glow|highlight
- blocks: feature: icon, eyebrow, title, description, stat, url (link)

### `footer`
site footer.

- copy: brand, description, copyright
- options: show_scheme_toggle (Toggle); scheme_toggle_placement=inline|floating; density=compact|comfortable|airy; shape=clean|contained|layered|wireframe
- blocks: link: column, label, description, url (link)

### `gallery`
grid of photos with captions.

- copy: eyebrow, title, intro
- options: layout=grid|masonry|carousel; columns=2|3|4; ratio=square|landscape|portrait|adapt; captions=none|below|overlay; align=start|center; shape=clean|contained|layered|wireframe; density=compact|comfortable|airy; effect=none|focus
- blocks: image: image (image), caption, url (link)

### `header`
site header.

- copy: brand_text, brand_logo (image), cta_label, cta_url (link)
- options: cta_enabled (Toggle); show_locale_switcher (Toggle); show_scheme_toggle (Toggle); scheme_toggle_placement=inline|floating; alignment=split|centered|compact; sticky (Toggle); show_border (Toggle); show_mobile_nav (Toggle); mobile_nav_style=docked|floating; mobile_nav_labels=always|active|hidden; mobile_nav_hide_on_scroll (checkbox); mobile_nav_menu (checkbox); mobile_nav_cta (checkbox); mobile_nav_cta_icon (icon); shape=clean|contained|layered|wireframe; density=compact|comfortable|airy
- blocks: nav-link: label, url (link), placement, icon

### `hero`
opening statement: headline, subheading, buttons, up to three proof facts.

- copy: eyebrow, heading, subheading, cta_url (link), cta_label, cta_secondary_url (link), cta_secondary_label, supporting_text, bg_image (image), bg_video, heading_highlight, rotating_words
- options: cta_enabled (Toggle); media_mode=none|background|start|end|below; overlay_opacity (range); layout=spotlight|editorial|compact; content_align=start|center; density=compact|comfortable|airy; shape=clean|contained|layered|wireframe; surface_style=glass|solid|none; use_accent_override (Toggle); accent_color (ColorPicker); backdrop=none|aurora|spotlight|spotlights|beams|meteors|grid|dots|lamp|stars; heading_effect=none|generate|highlight; cta_style=default|moving-border|glow-border
- blocks: proof: value, label

### `image-text`
one photo beside a paragraph of story or explanation.

- copy: eyebrow, title, body, url (link), label, image (image)
- options: media_placement=none|background|start|end|below; align=start|center; shape=clean|contained|layered|wireframe; density=compact|comfortable|airy

### `locations`
address, hours and map for places people visit.

- copy: eyebrow, title, intro, map_embed_url, map_image (image)
- options: map_source=auto|map|embed|image|none; map_zoom=auto|world|country|region|city|district|street|building; map_ratio=wide|standard|square|tall; map_tone=natural|muted|tinted|night; map_interactive (checkbox); layout=split|cards; columns=2|3; align=start|center; shape=clean|contained|layered|wireframe; density=compact|comfortable|airy
- blocks: location: name, address, lat, lng, phone, email, hours, map_url (link)
- `phone` renders its raw value as the link text (the `tel:` href is derived), so never put `tel:+1603...` in it: use a plain display number. Its "Phone:"/"Email:" labels do not render; for inline-labelled contact details use a `rich-text` or text section that keeps the labels, and keep a plain `phone` only for the card.
- `map_embed_url` must start with `https://www.google.com/maps/embed`, `https://maps.google.com/maps` or `https://www.openstreetmap.org/export/embed`, otherwise it is dropped (a pasted Google share link is not an embed URL). `lat`/`lng` accept pasted map URLs or `geo:` values; the section then draws a tile map (`maps.tile_url`, default tile.openstreetmap.org: not for busy production).

### `logo-cloud`
row of client or partner names; needs real clients from the brief.

- copy: eyebrow, title, intro
- options: layout=grid|row|marquee|carousel; align=start|center; shape=clean|contained|layered|wireframe; density=compact|comfortable|airy; tone=mono|color
- blocks: logo: name, logo (image)

### `marquee`
scrolling ribbon of short words or names.

- copy: title
- options: style=plain|pills; speed=slow|normal|fast; direction=forward|reverse; grayscale=muted|full
- blocks: item: text, image (image), url (link)

### `newsletter`
email signup with one-line promise.

- copy: heading, subheading, placeholder, button_label, success_message
- options: density=compact|comfortable|airy

### `portfolio`
project cards with title, category and blurb.

- copy: eyebrow, title, intro
- options: layout=grid|featured; columns=2|3; show_categories (checkbox); show_results (checkbox); align=start|center; shape=clean|contained|layered|wireframe; density=compact|comfortable|airy
- blocks: project: image (image), category, title, summary, result, url (link)

### `pricing`
plans with price and features; needs real prices from the brief.

- copy: eyebrow, title, intro, billing_note
- options: align=start|center; shape=clean|contained|layered|wireframe; density=compact|comfortable|airy
- blocks: plan: name, price, period, description, features, highlighted, url (link), label

### `rich-text`
free-form formatted text: a story, a policy, a manifesto.

- copy: eyebrow, title, body (rich), aside_title, aside_body (rich)
- options: layout=article|split; width=sm|md|lg; align=start|center; shape=clean|contained|layered|wireframe; density=compact|comfortable|airy; surface (Toggle)

### `scroll-showcase`
one product screenshot tilting into view; software only.

- copy: eyebrow, title, intro, image (image)
- options: frame=tablet|browser|plain; tilt=subtle|classic|dramatic; align=start|center; density=compact|comfortable|airy

### `showcase`
alternating photo-and-text rows, one offer or feature per row.

- copy: eyebrow, title, intro
- options: first_media_side=end|start; density=compact|comfortable|airy; shape=clean|contained|layered|wireframe
- blocks: row: eyebrow, title, description, bullets, image (image), url (link)

### `stats`
row of key numbers with labels; needs real numbers from the brief.

- copy: eyebrow, title, intro
- options: layout=grid|band; align=start|center; shape=clean|contained|layered|wireframe; density=compact|comfortable|airy
- blocks: stat: icon, value, label, description

### `steps`
a real sequence the visitor goes through, numbered.

- copy: eyebrow, title, intro
- options: layout=row|stack; columns=2|3|4; align=start|center; shape=clean|contained|layered|wireframe; density=compact|comfortable|airy
- blocks: step: icon, title, description

### `sticky-reveal`
pinned photo with points that scroll past.

- copy: eyebrow, title, intro
- options: media_side=start|end; align=start|center; density=compact|comfortable|airy
- blocks: item: title, description, image (image)

### `tabs`
tabbed panels of related content.

- copy: eyebrow, title, intro
- options: tab_style=underline|pills|boxed; placement=top|start; align=start|center; shape=clean|contained|layered|wireframe; density=compact|comfortable|airy
- blocks: tab: label, icon, heading, body, image (image)

### `team`
people with name, role and bio; needs real names from the brief.

- copy: eyebrow, title, intro
- options: layout=grid|carousel; style=cards|portraits|minimal; columns=2|3|4; align=start|center; show_socials (checkbox); shape=clean|contained|layered|wireframe; density=compact|comfortable|airy; effect=none|focus
- blocks: member: photo (image), name, role, bio, x_url (link), linkedin_url (link), github_url (link)
- A member with no photo: leave `photo` empty. The card renders an initials placeholder, not an empty box; check the rendered cards and tell the user which photos are missing.

### `testimonials`
customer quotes with names; needs real quotes from the brief.

- copy: eyebrow, title, intro
- options: layout=cards|featured|compact|carousel|moving; rows=1|2; speed=slow|normal|fast; align=start|center; shape=clean|contained|layered|wireframe; density=compact|comfortable|airy
- blocks: quote: quote, name, role, avatar (image)

### `timeline`
dated milestones in order; needs real dates from the brief.

- copy: eyebrow, title, intro
- options: style=steps|vertical|alternating|beam; marker=number|icon|dot; align=start|center; shape=clean|contained|layered|wireframe; density=compact|comfortable|airy
- blocks: step: icon, meta, title, description

### `video`
embedded video with heading and caption; needs a video link.

`video_url` accepts only YouTube (`watch`, `embed`, `shorts`, `youtu.be`), Vimeo (`vimeo.com/<id>`, `player.vimeo.com/video/<id>`) and direct `https://` or root-relative `.mp4`/`.webm`/`.ogg` files. Wistia, Loom, Vidyard or an `http://` mp4 parse to nothing and the section renders **empty with no error**: use a link plus cover image, or flag it in the report.

- copy: eyebrow, heading, description, video_url, cover (image)
- options: width=contained|narrow|full; ratio=wide|standard|cinema; align=start|center; shape=clean|contained|layered|wireframe; density=compact|comfortable|airy

