# Chloe's kart artwork

`chloe-kart.png` is the new transparent rear-view Chloe sprite used in the track picker, race, and finish screen. It was created with the built-in image generation tool, using `assets/reference/chloe_reference.png` as the identity reference. The alpha channel is preserved. Track scenery, rivals, road meshes, ramps and vertical loops are authored in code rather than downloaded artwork.

Final generation prompt:

> Use case: stylized-concept. Asset type: transparent game sprite for a child-friendly kart racer. Use the supplied girl as the identity reference: Chloe, chestnut shoulder-length hair, soft brown eyes, coral pink hoodie with white heart, smiling. Draw ONE full pink toy racing go-kart with Chloe seated safely, hands on steering wheel, facing away from viewer: REAR VIEW from slightly above, with her head turned very slightly so a small smiling cheek is visible. Camera directly centered behind kart, symmetric rear tyres visible, back of her chestnut hair prominent, pink hoodie. Rounded whimsical kart body in coral pink with cream rear heart emblem, four chunky black rubber wheels and tiny mint accents. Soft polished storybook / animated-film illustration, clean silhouette, no background, no floor, no shadow outside the object, genuine alpha transparency. Entire kart and girl in frame with 8% clear margin, square image. No lettering, no numbers, no logos, no other characters, no scenery. Preserve Chloe's hair, age and clothing identity from the reference.

The locally served renderer is Three.js 0.186.1. Its MIT license is included at `js/vendor/THREE-LICENSE.txt`. No CDN or image generation service is contacted during gameplay.
