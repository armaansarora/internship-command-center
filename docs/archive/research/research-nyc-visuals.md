# Research: NYC visual assets + image-based approaches for "The Tower"

## Executive summary

If the goal is to make users feel like they are looking out of a real Manhattan high-rise window, the best quality-to-effort options are: **(1) licensed real photography/video with optional layered parallax**, **(2) AI-assisted generation/editing built on a locked base composition**, and **(3) short looping skyline video for premium moments rather than default background**. These options deliver the strongest realism without the complexity of a full 3D city pipeline ([Getty licensing FAQ](https://www.gettyimages.com/faq/licensing), [Unsplash License](https://unsplash.com/license), [OpenAI image generation guide](https://developers.openai.com/api/docs/guides/image-generation/), [Black Forest Labs overview](https://docs.bfl.ai/flux_2), [web.dev video performance](https://web.dev/learn/performance/video-performance)).

**My top recommendation:** start with a **real ultra-wide NYC panorama or licensed skyline clip**, then create **2.5D depth layers** for subtle parallax in the hero state, and use AI only for controlled variants like weather, time-of-day, and cleanup edits rather than relying on pure text-to-image for every production asset ([Getty licensing FAQ](https://www.gettyimages.com/faq/licensing), [Unsplash License](https://unsplash.com/license), [Depth Anything V2](https://github.com/DepthAnything/Depth-Anything-V2), [OpenAI GPT image prompting guide](https://developers.openai.com/cookbook/examples/multimodal/image-gen-1.5-prompting_guide/)).

## What success looks like for this app

For a SaaS background, the asset needs to feel like a **single believable view** with high architectural realism, repeatable day/night/weather variants, good compression behavior, and predictable licensing for commercial web use ([Getty licensing FAQ](https://www.gettyimages.com/faq/licensing), [Unsplash License](https://unsplash.com/license)).

The hardest requirement is not “generate a pretty skyline,” but **maintain the same viewpoint** across time of day, weather, and camera height without drift or uncanny building geometry ([Midjourney Parameter List](https://docs.midjourney.com/hc/en-us/articles/32859204029709-Parameter-List), [OpenAI GPT image prompting guide](https://developers.openai.com/cookbook/examples/multimodal/image-gen-1.5-prompting_guide/), [Black Forest Labs overview](https://docs.bfl.ai/flux_2)).

---

## 1) AI-generated imagery

### Bottom line

AI can produce beautiful NYC-style skylines, but **pure text-to-image is weak for production consistency** when you need the exact same camera position across dawn/day/dusk/night/weather states. It becomes much more viable when you **start from one approved base image and use edit/reference workflows** instead of prompting from scratch each time ([OpenAI image generation guide](https://developers.openai.com/api/docs/guides/image-generation/), [OpenAI GPT image prompting guide](https://developers.openai.com/cookbook/examples/multimodal/image-gen-1.5-prompting_guide/), [Black Forest Labs overview](https://docs.bfl.ai/flux_2)).

### Model-by-model assessment

#### Midjourney

Midjourney supports aspect ratio control with `--ar`, repeatability experiments with `--seed`, stronger control via `--raw`, style matching via `--sref`, and reference-based form guidance via `--oref`, which is useful for pushing the model toward a stable composition style ([Midjourney Parameter List](https://docs.midjourney.com/hc/en-us/articles/32859204029709-Parameter-List)).

Midjourney v7 upscaled square outputs are `2048x2048`, and higher detail settings `--q 2` and `--q 4` spend 2x and 4x more GPU time respectively, improving texture/detail but not solving viewpoint lock by themselves ([Midjourney Image Size & Resolution](https://docs.midjourney.com/hc/en-us/articles/33329374594957-Image-Size-Resolution), [Midjourney Quality](https://docs.midjourney.com/hc/en-us/articles/32176522101773-Quality)).

Midjourney is strong for **concept exploration** and mood frames, but weaker for a product requirement like “same penthouse-facing Manhattan view at 6am, noon, rain, snow, and night” because seeds and references help but do not provide deterministic scene continuity ([Midjourney Parameter List](https://docs.midjourney.com/hc/en-us/articles/32859204029709-Parameter-List)).

#### DALL·E 3 / OpenAI image stack

DALL·E 3 officially supports `1024x1024`, `1024x1536`, and `1536x1024` outputs, so it can do landscape but not true ultra-wide panoramic outputs natively ([OpenAI DALL·E 3 model docs](https://developers.openai.com/api/docs/models/dall-e-3), [OpenAI Help Center](https://help.openai.com/en/articles/8555480-dalle-3-api)).

For OpenAI’s newer image workflows, the key production advantage is the **edit/reference flow**, where you can generate a base image and then iteratively request changes like “make it winter evening with snowfall” or “preserve the exact layout, proportions, and perspective,” which is exactly the control pattern needed for one skyline view with multiple atmospheric variants ([OpenAI GPT image prompting guide](https://developers.openai.com/cookbook/examples/multimodal/image-gen-1.5-prompting_guide/), [OpenAI image generation guide](https://developers.openai.com/api/docs/guides/image-generation/)).

OpenAI’s prompting guidance explicitly recommends specifying **framing, viewpoint, perspective, lighting, and intended use**, and refining with **small iterative changes** instead of overloading a single prompt, which aligns well with a locked-view skyline pipeline ([OpenAI GPT image prompting guide](https://developers.openai.com/cookbook/examples/multimodal/image-gen-1.5-prompting_guide/)).

#### Stable Diffusion / Stability AI

Stability’s APIs support fixed aspect ratios including `16:9` at `1344x768` and `21:9` at `1536x640`, which is better for web-background compositions than square-first models, although the platform positions these generation endpoints at roughly **1 megapixel** output before upscaling/enhancement ([Stability aspect ratio guide](https://kb.stability.ai/knowledge-base/understanding-aspect-ratios-in-our-apis), [Stability API reference](https://platform.stability.ai/docs/api-reference), [Stability AI Stable Image](https://stability.ai/stable-image)).

Stability also offers edit, control, upscale, and enhance workflows, which makes it better suited than pure one-shot generation for consistent background variants ([Stability AI Stable Image](https://stability.ai/stable-image), [Stability release notes](https://platform.stability.ai/docs/release-notes)).

For truly wide generated panoramas, the open-source MultiDiffusion panorama pipeline recommends width `2048` with circular padding for seamless left-right transitions, specifically to avoid stitching artifacts in panoramic imagery ([Hugging Face MultiDiffusion panorama docs](https://huggingface.co/docs/diffusers/api/pipelines/panorama)).

That said, the panorama pipeline is marked deprecated in Diffusers, so it is viable as an R&D path but not the cleanest long-term production dependency unless your team is already comfortable maintaining custom generation infrastructure ([Hugging Face MultiDiffusion panorama docs](https://huggingface.co/docs/diffusers/api/pipelines/panorama)).

#### Flux

Flux is currently the most interesting AI option for this use case because Black Forest Labs documents **any aspect ratio**, **up to 4MP output**, and **multi-reference editing with up to 10 input images**, which directly supports composition locking and repeatable scene edits ([Black Forest Labs overview](https://docs.bfl.ai/flux_2)).

FLUX1.1 Pro documentation shows width/height controls with production pricing around **$0.04 per image** at the documented endpoint, while FLUX.2 expands into multi-reference editing and stronger consistency controls ([FLUX1.1 Pro docs](https://docs.bfl.ai/flux_models/flux_1_1_pro), [Black Forest Labs overview](https://docs.bfl.ai/flux_2)).

Because Flux supports reference images and editing, it is better positioned than Midjourney for “same skyline, different atmosphere” workflows, especially if you give it a locked base render or photo and only vary lighting/weather prompts ([Black Forest Labs overview](https://docs.bfl.ai/flux_2), [FLUX1.1 dev API](https://docs.bfl.ai/api-reference/models/generate-an-image-with-flux1-%5Bdev%5D)).

### Best prompting strategy for NYC skyline realism

Across modern image models, the most effective prompts are **subject-first and camera-specific**, not keyword spam like “ultra realistic 8k masterpiece” ([Black Forest Labs interactive prompt builder](https://docs.bfl.ai/guides/prompting_guide_interactive_builder), [OpenAI GPT image prompting guide](https://developers.openai.com/cookbook/examples/multimodal/image-gen-1.5-prompting_guide/)).

Use a base structure like:

- **Scene**: “Photorealistic panoramic view of Manhattan skyline seen from inside a modern high-rise apartment window”  
- **Viewpoint**: “camera at penthouse height, looking south/southwest, 50mm-equivalent feel, eye-level interior vantage”  
- **Composition**: “wide negative space on left for UI, skyline concentrated across midground, realistic Hudson/East River haze”  
- **Lighting/time**: “clear winter dawn” / “humid summer dusk” / “overcast rainy afternoon” / “snowy blue-hour evening”  
- **Constraints**: “preserve exact layout and perspective of the reference image, do not redesign buildings, no surreal lighting, no exaggerated lens distortion”  
- **Use intent**: “premium SaaS web app hero background, subtle, believable, not cinematic poster art”  
  ([OpenAI GPT image prompting guide](https://developers.openai.com/cookbook/examples/multimodal/image-gen-1.5-prompting_guide/), [Black Forest Labs interactive prompt builder](https://docs.bfl.ai/guides/prompting_guide_interactive_builder)).

### Example prompts that should work best

**Base-generation prompt**  
“Create a photorealistic panoramic Manhattan skyline background as viewed from inside a luxury high-rise apartment in New York. Eye-level camera at approximately 40 floors up, natural architectural perspective, realistic building spacing and window patterns, subtle atmospheric haze, premium real-estate photography look. Wide composition with open negative space for UI overlay. Preserve believable geometry and lighting, avoid stylization, avoid cinematic exaggeration.” ([OpenAI GPT image prompting guide](https://developers.openai.com/cookbook/examples/multimodal/image-gen-1.5-prompting_guide/), [Black Forest Labs interactive prompt builder](https://docs.bfl.ai/guides/prompting_guide_interactive_builder)).

**Variant-edit prompt from approved base**  
“Edit this skyline image to a rainy dusk version. Preserve the exact camera position, building layout, framing, perspective, and skyline identity. Change only atmosphere and lighting: wet haze, reflective windows, low-contrast cloud cover, realistic twilight glow, soft interior-window feel. Do not add or remove buildings. Keep it natural and photorealistic.” ([OpenAI GPT image prompting guide](https://developers.openai.com/cookbook/examples/multimodal/image-gen-1.5-prompting_guide/)).

**Snow variant**  
“Edit the approved Manhattan skyline background into a winter evening with light snowfall. Preserve exact viewpoint, composition, and all skyline geometry. Add cold ambient light, slightly desaturated atmosphere, realistic snow accumulation only where visible from distance, subtle blue-hour glow, believable visibility falloff. No dramatic storm effects, no fantasy mood.” ([OpenAI GPT image prompting guide](https://developers.openai.com/cookbook/examples/multimodal/image-gen-1.5-prompting_guide/)).

**Ground-level variant**  
“Create the same Manhattan-facing scene from a much lower interior floor, approximately 5–8 stories above street level, maintaining realistic urban occlusion by nearby buildings and a more compressed skyline view. Photorealistic commercial-architectural photography style, clean overcast daylight.” ([OpenAI GPT image prompting guide](https://developers.openai.com/cookbook/examples/multimodal/image-gen-1.5-prompting_guide/)).

### Resolution reality check

- Midjourney square upscales: `2048x2048` documented for default 1:1, with aspect ratio control but not clearly documented panoramic maxes on the cited page ([Midjourney Image Size & Resolution](https://docs.midjourney.com/hc/en-us/articles/33329374594957-Image-Size-Resolution), [Midjourney Parameter List](https://docs.midjourney.com/hc/en-us/articles/32859204029709-Parameter-List)).
- DALL·E 3: up to `1536x1024` landscape ([OpenAI DALL·E 3 model docs](https://developers.openai.com/api/docs/models/dall-e-3)).
- Stability Ultra/Core: around `1MP` generation with supported wide ratios like `21:9` at `1536x640` ([Stability API reference](https://platform.stability.ai/docs/api-reference), [Stability aspect ratio guide](https://kb.stability.ai/knowledge-base/understanding-aspect-ratios-in-our-apis)).
- MultiDiffusion panorama: recommended `2048x512`-style class output with panorama pipeline defaults at width `2048`, height `512` ([Hugging Face MultiDiffusion panorama docs](https://huggingface.co/docs/diffusers/api/pipelines/panorama)).
- Flux.2: up to `4MP` output and any aspect ratio ([Black Forest Labs overview](https://docs.bfl.ai/flux_2)).

### AI-generated imagery verdict

**Best use:** generate concept directions, then lock one base composition and use edit/reference mode for weather/time variants.  
**Worst use:** expecting one-shot text prompts to produce a deterministic family of skyline states for production.  
**Production viability:** medium if reference-driven, low-to-medium if pure text-to-image.  
([OpenAI image generation guide](https://developers.openai.com/api/docs/guides/image-generation/), [Black Forest Labs overview](https://docs.bfl.ai/flux_2), [Midjourney Parameter List](https://docs.midjourney.com/hc/en-us/articles/32859204029709-Parameter-List)).

---

## 2) Stock photography / panoramic sources

### Bottom line

This is the **highest-confidence path to photorealism** because the source is real, licensing is understandable, and you can start with a true Manhattan view rather than asking a model to invent one ([Getty licensing FAQ](https://www.gettyimages.com/faq/licensing), [Unsplash License](https://unsplash.com/license)).

### Best sources

#### Getty / Shutterstock / premium stock

Getty explicitly licenses royalty-free creative images and video for websites, advertising, presentations, and similar commercial uses, with broad perpetual usage rights under the RF model, which maps cleanly to a SaaS background use case ([Getty licensing FAQ](https://www.gettyimages.com/faq/licensing), [Getty Content License Agreement](https://www.gettyimages.com/eula)).

Getty also has large inventories specifically for **NYC skyline**, **NYC skyline panorama**, and **360 New York** search categories, which indicates good availability of ultra-wide source material ([Getty NYC skyline](https://www.gettyimages.com/photos/new-york-city-skyline), [Getty NYC skyline panorama](https://www.gettyimages.com/photos/new-york-city-skyline-panorama), [Getty 360 New York](https://www.gettyimages.com/photos/360-new-york)).

I did not retrieve an official Shutterstock licensing page in the collected sources, so Getty is the better-cited premium option in this report ([Getty licensing FAQ](https://www.gettyimages.com/faq/licensing)).

#### Unsplash

Unsplash grants an irrevocable worldwide commercial license without attribution requirements, which makes it attractive for prototypes or even production if you find the exact right shot ([Unsplash License](https://unsplash.com/license)).

Unsplash also has public NYC skyline and panorama search pages, but the quality and compositional uniqueness are less curated than Getty-level premium stock, so it is better as a low-cost discovery source than as the default final pipeline ([Unsplash NYC skyline search](https://unsplash.com/s/photos/new-york-city-skyline), [Unsplash New York panorama search](https://unsplash.com/s/photos/new-york-panorama)).

#### 360 / gigapixel panorama providers

360Cities documented a **20-gigapixel New York panorama** created from 2,000 images, which shows that extremely high-resolution source material exists for NYC cityscape use cases ([360Cities blog](https://blog.360cities.net/2016/03/04/20-gigapixel-panorama-of-new-york-city/)).

AirPano and 360Cities are useful when you want immersive or ultra-wide source material, but you will need to review the specific licensing terms outside this report before production use because only availability, not full rights terms, was collected here ([360Cities blog](https://blog.360cities.net/2016/03/04/20-gigapixel-panorama-of-new-york-city/)).

#### Drone stills / footage

Getty and Storyblocks both expose NYC drone-related collections, and Pond5 has large Manhattan skyline footage inventory plus at least one explicitly marketed **seamless skyline loop** listing, which is promising for motion backgrounds ([Getty drone NYC](https://www.gettyimages.com/photos/drone-footage-nyc), [Storyblocks New York drone](https://www.storyblocks.com/video/search/new-york-drone), [Pond5 Manhattan skyline footage](https://www.pond5.com/search?kw=manhattan-skyline&media=footage), [Pond5 seamless loop listing](https://www.pond5.com/stock-footage/item/251921651-new-york-city-manhattan-skyline-cinemagraph-seamless-video-l)).

### Google Earth Studio

Google Earth Studio is visually impressive and can produce cinematic skyline imagery, and Google recommends tilt angles between **40° and 60°**, avoiding low street-level proximity, and rendering as high as **3840x2160** for better mesh/texture quality ([Earth Studio best practices](https://earth.google.com/studio/docs/best-practices/)).

However, Google’s FAQ explicitly says they **do not offer a license to use Google Earth imagery for commercial applications**, and all Earth Studio output requires visible attribution that cannot be removed ([Google Earth Studio FAQ](https://www.google.com/earth/studio/faq/), [Earth Studio attribution](https://earth.google.com/studio/docs/attribution/), [Google geo guidelines](https://www.google.com/permissions/geoguidelines/)).

That makes Earth Studio **non-viable as a clean SaaS background source** for this product unless the visible attribution is acceptable and the use case falls within Google’s permitted contexts, which is usually not the desired outcome for a premium web app hero ([Google Earth Studio FAQ](https://www.google.com/earth/studio/faq/), [Earth Studio attribution](https://earth.google.com/studio/docs/attribution/)).

### Stock / panoramic source verdict

This is the **best first stop** for production because it gives you real geometry, predictable quality, and a licensable commercial path, especially through Getty or a similar premium source ([Getty licensing FAQ](https://www.gettyimages.com/faq/licensing), [Getty Content License Agreement](https://www.gettyimages.com/eula)).

---

## 3) HDRI / environment maps

### Bottom line

HDRIs are excellent for **lighting and environmental reflections** in Three.js, but they are **not a direct substitute** for a realistic NYC skyline window view unless you find a very city-specific equirectangular urban panorama ([Poly Haven urban HDRIs](https://polyhaven.com/hdris/urban), [Poly Haven license](https://polyhaven.com/license)).

### What exists

Poly Haven offers free urban, night, and sunrise/sunset HDRIs, all under **CC0**, so they are safe for commercial product use without attribution requirements ([Poly Haven urban HDRIs](https://polyhaven.com/hdris/urban), [Poly Haven urban night HDRIs](https://polyhaven.com/hdris/urban/night), [Poly Haven sunrise-sunset HDRIs](https://polyhaven.com/hdris/sunrise-sunset), [Poly Haven license](https://polyhaven.com/license)).

HDRMAPS and HDRI Skies also offer high-resolution HDRIs, including libraries reaching **20K** in some cases, but these are general-purpose environment sources rather than NYC-specific skyline assets in the collected evidence ([HDRMAPS homepage](https://hdrmaps.com), [HDRMAPS freebies](https://hdrmaps.com/freebies/), [HDRI Skies](https://hdri-skies.com), [HDRI Skies freebies](https://hdri-skies.com/free-hdris/)).

I did **not** find a clearly documented NYC-specific HDRI in the collected sources, so assume that a true Manhattan HDRI will either require a custom shoot, a niche marketplace, or converting a panorama into an approximate lighting environment yourself ([Poly Haven urban HDRIs](https://polyhaven.com/hdris/urban)).

### Can you convert panoramic photos into HDRIs?

You can convert an LDR panorama into an environment map for background/reflection use, but it will **not become a true HDRI with high dynamic range lighting information** unless the source was captured as bracketed HDR or reconstructed from multiple exposures. This conclusion follows from the difference between ordinary panoramic imagery and actual HDRI libraries like HDRMAPS and Poly Haven, which are built as dedicated environment-light assets rather than normal photos ([HDRMAPS homepage](https://hdrmaps.com), [Poly Haven HDRIs](https://polyhaven.com/hdris/)).

### HDRI verdict

Use HDRIs if you are building a 3D interior with reflective surfaces or subtle environmental light, but do not make HDRI your primary NYC-view strategy unless you already have a city-specific panoramic environment map. For this app, HDRI is usually an **adjunct**, not the hero asset ([Poly Haven license](https://polyhaven.com/license), [Poly Haven urban HDRIs](https://polyhaven.com/hdris/urban)).

---

## 4) Layered approach: depth layers + parallax from a single image

### Bottom line

This is one of the **strongest practical upgrades** to a still skyline image because it adds a sense of depth and “window realism” without the cost of real-time 3D rendering ([Depth Anything V2](https://github.com/DepthAnything/Depth-Anything-V2), [DepthFlow](https://github.com/BrokenSource/DepthFlow), [depth-based-parallax-effect](https://github.com/r-gheda/depth-based-parallax-effect)).

### Tools

- **Depth Anything / Depth Anything V2** are modern monocular depth models designed for robust single-image depth estimation, and V2 specifically emphasizes finer details and robustness ([Depth Anything](https://github.com/LiheYoung/Depth-Anything), [Depth Anything V2](https://github.com/DepthAnything/Depth-Anything-V2)).
- **MiDaS** remains a credible option, though the repository was archived in 2025, so it is less future-forward than Depth Anything V2 ([MiDaS](https://github.com/isl-org/MiDaS)).
- **DepthFlow** and similar tools can turn a single image plus depth map into 3D parallax animation, with GPU-based rendering and high-resolution export claims ([DepthFlow](https://github.com/BrokenSource/DepthFlow)).
- The `depth-based-parallax-effect` project explicitly supports generating/editing depth maps and exporting parallax video from a single source image ([depth-based-parallax-effect](https://github.com/r-gheda/depth-based-parallax-effect)).

### Recommended workflow

1. Start with a **real skyline panorama**.  
2. Run **Depth Anything V2** to estimate scene depth.  
3. Manually clean masks for major depth planes: nearest rooftops / midtown towers / far skyline / sky.  
4. Inpaint occluded gaps behind separated foreground layers.  
5. Animate only **subtle horizontal camera drift**, not aggressive dolly movement.  
6. Export as either layered images for WebGL/CSS parallax or as a pre-rendered loop.  
   ([Depth Anything V2](https://github.com/DepthAnything/Depth-Anything-V2), [DepthFlow](https://github.com/BrokenSource/DepthFlow), [depth-based-parallax-effect](https://github.com/r-gheda/depth-based-parallax-effect)).

### Optimal number of layers

For skyline backgrounds, **3 to 5 layers** is usually the sweet spot:  
- foreground rooftops / window frame reflections,  
- midground buildings,  
- background skyline,  
- distant haze / river,  
- sky.  
This recommendation is a synthesis based on how depth-map parallax systems work and the fact that simple pixel shifting is performant while full scene reconstruction gets complex quickly ([CommunityToolkit depth-map discussion](https://github.com/CommunityToolkit/Labs-Windows/discussions/458), [DepthFlow](https://github.com/BrokenSource/DepthFlow)).

More than that tends to create authoring overhead with limited visible benefit in a web hero, especially because skyline geometry is mostly read as large depth masses rather than close objects ([DepthFlow](https://github.com/BrokenSource/DepthFlow), [depth-based-parallax-effect](https://github.com/r-gheda/depth-based-parallax-effect)).

### Resolution and file-size guidance

Keep the master art large, but ship compressed web assets. A practical target is a hero image around **2560–3840 px wide** for high-density displays, with separate depth/layer masks at lower resolution if needed, since the parallax effect depends more on clean plane separation than on every mask being full-resolution ([Midjourney Image Size & Resolution](https://docs.midjourney.com/hc/en-us/articles/33329374594957-Image-Size-Resolution), [web.dev video performance](https://web.dev/learn/performance/video-performance)).

### Layered approach verdict

This is a **top-tier recommendation** because it creates perceived premium depth from a single approved skyline plate while keeping performance manageable ([Depth Anything V2](https://github.com/DepthAnything/Depth-Anything-V2), [CommunityToolkit depth-map discussion](https://github.com/CommunityToolkit/Labs-Windows/discussions/458)).

---

## 5) Video backgrounds

### Bottom line

Looping skyline video can look incredible, especially for dusk-to-night or weather scenes, but it raises bandwidth and decoding cost. It is best for **premium surfaces** like landing, login, or a flagship dashboard rather than every route in the product ([web.dev video performance](https://web.dev/learn/performance/video-performance)).

### Source options

- Getty has a large NYC timelapse library ([Getty NYC timelapse videos](https://www.gettyimages.com/videos/new-york-city-timelapse)).
- Pond5 has a very large Manhattan skyline footage inventory and an explicit seamless loop listing ([Pond5 Manhattan skyline footage](https://www.pond5.com/search?kw=manhattan-skyline&media=footage), [Pond5 seamless loop listing](https://www.pond5.com/stock-footage/item/251921651-new-york-city-manhattan-skyline-cinemagraph-seamless-video-l)).
- Storyblocks exposes NYC skyline timelapse, skyline loop, and drone collections ([Storyblocks NYC skyline timelapse](https://www.storyblocks.com/video/search/nyc-skyline-timelapse?page=1), [Storyblocks skyline loop](https://www.storyblocks.com/video/search/skyline+loop), [Storyblocks New York](https://www.storyblocks.com/video/search/new-york)).

### Web performance guidance

For autoplay background video, the best-practice markup is `<video autoplay muted loop playsinline>` with both **WebM** and **MP4** sources, placing WebM first and MP4 as fallback ([web.dev video performance](https://web.dev/learn/performance/video-performance)).

web.dev recommends video over GIF because it is much more bandwidth-efficient, and specifically notes that compression reduces bandwidth and can improve page-load metrics like LCP ([web.dev video performance](https://web.dev/learn/performance/video-performance)).

WebM is generally the better compression/performance format for modern browsers, while MP4/H.264 remains the compatibility fallback ([web.dev video performance](https://web.dev/learn/performance/video-performance)).

### Practical resolution tradeoffs

For a background layer, **1080p** is usually enough if the composition is soft and cinematic, while **4K** should be reserved for large hero displays or heavily cropped footage because it increases file size and decode cost. This recommendation aligns with web.dev’s emphasis on compression and bandwidth discipline, and with Google Earth Studio’s own suggestion to oversample only when you need visible quality improvements ([web.dev video performance](https://web.dev/learn/performance/video-performance), [Earth Studio best practices](https://earth.google.com/studio/docs/best-practices/)).

### Video verdict

Visually excellent, but use selectively and keep duration short, loop cleanly, and compress aggressively. For most SaaS contexts, a still or 2.5D plate is the smarter default, with video as a premium enhancement ([web.dev video performance](https://web.dev/learn/performance/video-performance)).

---

## 6) Procedural generation

### Bottom line

A procedurally generated city is usually **overkill** for this problem if the target is photorealistic Manhattan seen through a window. It can be stylish, interactive, and technically impressive, but matching real NYC architectural density and skyline identity is much harder than licensing or generating a 2D/2.5D plate ([three.js procedural city](https://github.com/jeromeetienne/threex.proceduralcity), [Three.js city generator project](https://github.com/MHillier98/IntroToComputerGraphics-CityGenerator), [Three.js forum virtual city](https://discourse.threejs.org/t/threejs-cannon-virtual-experience-engine/39402)).

### What exists

There are lightweight procedural city generators in Three.js, including `threex.proceduralcity` and academic/demo projects that generate city blocks and roads procedurally ([three.js procedural city](https://github.com/jeromeetienne/threex.proceduralcity), [Three.js city generator project](https://github.com/MHillier98/IntroToComputerGraphics-CityGenerator)).

There are also more advanced virtual-city experiences that combine Three.js with optimized city models and avatar pipelines like Mixamo/Ready Player Me integration, but these are much closer to game-environment engineering than background-asset production ([Three.js forum virtual city](https://discourse.threejs.org/t/threejs-cannon-virtual-experience-engine/39402)).

### Why it is usually the wrong choice here

Procedural systems can create “city-like” skylines, but not a **convincing Manhattan-specific view** without substantial custom modeling, texturing, optimization, and lighting work ([three.js procedural city](https://github.com/jeromeetienne/threex.proceduralcity), [Three.js city generator project](https://github.com/MHillier98/IntroToComputerGraphics-CityGenerator)).

If the experience does not require free camera movement or true 3D interactivity, the user will not notice enough extra value to justify the implementation cost ([Three.js forum virtual city](https://discourse.threejs.org/t/threejs-cannon-virtual-experience-engine/39402)).

### Procedural verdict

Only pursue this if “The Tower” is meant to become a real-time 3D product experience. For a window-view background, it is generally **not the right quality-to-effort tradeoff** ([three.js procedural city](https://github.com/jeromeetienne/threex.proceduralcity), [Three.js forum virtual city](https://discourse.threejs.org/t/threejs-cannon-virtual-experience-engine/39402)).

---

## Comparative ratings

| Approach | Quality (1-10) | Performance cost | Implementation difficulty | Cost | Production viability | Notes |
|---|---:|---|---|---|---|---|
| Premium stock panorama/photo + light retouch | 9.5 | Low | Low | $$ | Very high | Best realism and licensing clarity with Getty-style sources ([Getty licensing FAQ](https://www.gettyimages.com/faq/licensing)) |
| Real photo + depth layers/parallax | 9.0 | Low-Medium | Medium | $$-$$$ | Very high | Strong “window depth” illusion without full 3D ([Depth Anything V2](https://github.com/DepthAnything/Depth-Anything-V2), [DepthFlow](https://github.com/BrokenSource/DepthFlow)) |
| AI edit pipeline from locked base image | 8.0 | Low | Medium | $-$$ | High | Best AI route for day/night/weather consistency ([OpenAI GPT image prompting guide](https://developers.openai.com/cookbook/examples/multimodal/image-gen-1.5-prompting_guide/), [Black Forest Labs overview](https://docs.bfl.ai/flux_2)) |
| Pure AI text-to-image family of assets | 6.5 | Low | Medium | $ | Medium | Fast ideation, but viewpoint drift is the risk ([Midjourney Parameter List](https://docs.midjourney.com/hc/en-us/articles/32859204029709-Parameter-List), [OpenAI image generation guide](https://developers.openai.com/api/docs/guides/image-generation/)) |
| Looping skyline video | 9.0 | Medium-High | Low-Medium | $$ | High for selected pages | Beautiful but bandwidth-heavy ([web.dev video performance](https://web.dev/learn/performance/video-performance)) |
| HDRI/environment map as hero view | 5.5 | Medium | Medium | $-$$ | Medium-Low | Great support layer, weak primary solution ([Poly Haven urban HDRIs](https://polyhaven.com/hdris/urban)) |
| Google Earth Studio render | 7.5 | Low-Medium | Medium | $ | Low | Looks good, but commercial and attribution constraints are a blocker ([Google Earth Studio FAQ](https://www.google.com/earth/studio/faq/), [Earth Studio attribution](https://earth.google.com/studio/docs/attribution/)) |
| Procedural Three.js city | 6.0 | High | High | $$$$ | Low-Medium | Overkill unless the product truly needs 3D interactivity ([three.js procedural city](https://github.com/jeromeetienne/threex.proceduralcity)) |

---

## Recommended top 2–3 approaches

### Recommendation 1: Premium real panorama/photo + subtle layered parallax

This is the best overall choice because it combines **true photorealism**, manageable implementation, and strong commercial licensing with a premium-feeling depth effect ([Getty licensing FAQ](https://www.gettyimages.com/faq/licensing), [Depth Anything V2](https://github.com/DepthAnything/Depth-Anything-V2)).

**Ideal implementation:**  
- License a real NYC skyline panorama or high-res still from Getty-level premium stock.  
- Cut into 3–5 depth layers.  
- Add very subtle parallax tied to mouse movement or page scroll.  
- Prepare 2–4 approved atmospheric variants manually or with AI-assisted edits.  
  ([Getty licensing FAQ](https://www.gettyimages.com/faq/licensing), [DepthFlow](https://github.com/BrokenSource/DepthFlow), [Depth Anything V2](https://github.com/DepthAnything/Depth-Anything-V2)).

### Recommendation 2: Real or approved base image + AI edit pipeline for time/weather variants

Use AI as an **editing and extension tool**, not as the sole source of truth. This gives you fast production of dawn/day/dusk/night/rain/snow variants while keeping skyline composition stable ([OpenAI GPT image prompting guide](https://developers.openai.com/cookbook/examples/multimodal/image-gen-1.5-prompting_guide/), [Black Forest Labs overview](https://docs.bfl.ai/flux_2)).

If choosing an AI stack, **Flux.2** and **OpenAI image editing workflows** look strongest for this specific need because both support reference/edit patterns rather than pure text-only generation ([Black Forest Labs overview](https://docs.bfl.ai/flux_2), [OpenAI image generation guide](https://developers.openai.com/api/docs/guides/image-generation/)).

### Recommendation 3: Short looping skyline video for flagship surfaces only

Use this only where motion meaningfully upgrades the product feel, such as onboarding, login, or a premium “Tower mode” dashboard. Keep the default product background static or 2.5D for performance sanity ([web.dev video performance](https://web.dev/learn/performance/video-performance), [Pond5 seamless loop listing](https://www.pond5.com/stock-footage/item/251921651-new-york-city-manhattan-skyline-cinemagraph-seamless-video-l)).

---

## Suggested production plan

### Fastest high-quality path

1. Find **3–5 premium NYC skyline candidates** from Getty or similar with a clear high-rise/penthouse perspective ([Getty NYC skyline panorama](https://www.gettyimages.com/photos/new-york-city-skyline-panorama), [Getty Manhattan skyline panorama](https://www.gettyimages.com/photos/manhattan-skyline-panorama)).
2. Select one “hero view” and one backup “moody/night” view ([Getty NYC skyline](https://www.gettyimages.com/photos/new-york-city-skyline)).
3. Create a layered parallax version using **Depth Anything V2** + manual cleanup ([Depth Anything V2](https://github.com/DepthAnything/Depth-Anything-V2)).
4. Use **OpenAI or Flux edit workflows** to create weather/time variants from the same approved plate ([OpenAI GPT image prompting guide](https://developers.openai.com/cookbook/examples/multimodal/image-gen-1.5-prompting_guide/), [Black Forest Labs overview](https://docs.bfl.ai/flux_2)).
5. Export compressed desktop/mobile variants and test the visual under real UI overlays ([web.dev video performance](https://web.dev/learn/performance/video-performance)).

### If budget is extremely tight

Use Unsplash for initial stills, then add depth layering/parallax and AI-assisted atmosphere edits, while recognizing the curation and uniqueness ceiling versus premium stock ([Unsplash License](https://unsplash.com/license), [Unsplash NYC skyline search](https://unsplash.com/s/photos/new-york-city-skyline), [Depth Anything V2](https://github.com/DepthAnything/Depth-Anything-V2)).

---

## Final call

If this were my build, I would **not** start with procedural 3D or Google Earth Studio, and I would **not** rely on pure one-shot AI generation for the hero asset family ([Google Earth Studio FAQ](https://www.google.com/earth/studio/faq/), [three.js procedural city](https://github.com/jeromeetienne/threex.proceduralcity), [Midjourney Parameter List](https://docs.midjourney.com/hc/en-us/articles/32859204029709-Parameter-List)).

I would ship **a real licensed Manhattan skyline plate**, convert it into a **2.5D layered background**, and use **reference-based AI editing** only to multiply variants once the core composition is approved ([Getty licensing FAQ](https://www.gettyimages.com/faq/licensing), [Depth Anything V2](https://github.com/DepthAnything/Depth-Anything-V2), [OpenAI GPT image prompting guide](https://developers.openai.com/cookbook/examples/multimodal/image-gen-1.5-prompting_guide/), [Black Forest Labs overview](https://docs.bfl.ai/flux_2)).

That is the best balance of **stunning realism, feasible effort, controllable consistency, and production safety** for a SaaS app that wants to feel like a real high-rise Manhattan view ([Getty licensing FAQ](https://www.gettyimages.com/faq/licensing), [Unsplash License](https://unsplash.com/license), [DepthFlow](https://github.com/BrokenSource/DepthFlow)).
