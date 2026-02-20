# Motion Specs

## Durations
- Fast: `120ms`
- Normal: `220ms`
- Slow: `320ms`

## Easing
- Standard: `cubic-bezier(0.2,0,0,1)`
- Emphasized: `cubic-bezier(0.2,0,0,1.2)`

## Applied Behaviors
- Top bar collapse/expand uses `motion.normal`.
- Pressed states use immediate opacity/scale changes.
- Modal sheet uses native modal animation, with tokenized durations for future custom animation.
