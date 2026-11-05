# Greg model creation handoff for Claude

## Responsibility

Isaac confirmed that Claude will make Greg's character model. Isaac supplies the creative direction and reviews the result. Claude should develop the model using the existing project foundation and the confirmed visual anchors.

## Confirmed anchors

Greg wears a baseball cap, a blue hoodie, and black pants. He is an often-unlucky recurring supporting character. His final face, exact palette, proportions, cap details, and any accessories are still to be developed. Earlier suggestions such as white shoes and age 23 remain proposals.

## Starting source

Inspect 10_Previous_Project/what-if-underwater/src/character.js and src/scenes.js. Reuse the existing geometry, face system, joint controls, motion presets, and CAST pattern where suitable. The builder supports caps, long sleeves, and pants. Add hoodie-specific geometry required by the selected design, including its hood and any pocket details.

## Expected model work

1. Develop a consistent Greg design from the confirmed anchors and label remaining design choices.
2. Implement one reusable model specification or asset, with a stable identity across scenes.
3. Preserve useful face, pose, and hand-prop capabilities from the existing system.
4. Test a neutral standing pose, seated pose, newspaper or food interaction, and a short recognition reaction.
5. Produce front, side, back, and expression views when the model is ready for visual review.
6. Record filenames, model version, palette, proportions, supported poses, and any limitations.

## Looks folder

Looks is currently empty as Isaac requested. Do not add placeholders. When Claude's model work produces actual character reference images, store those references there and update Design_Status_and_Continuity.md. Keep model source files and their asset records traceable.

This handoff assigns the future model work. The handbook correction itself does not create a finished model.
