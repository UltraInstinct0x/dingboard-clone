# dingboard-clone
https://mahikgot.github.io/dingboard-clone/

only tested on chrome
## Implemented
- image segmentation (use first button, then click on part you want to segment)
  - clientside both encoder + decoder of MobileSAM using ONNX.
  - uses WEBGPU by default, fallback to CPU if not available (slow)
- depth based background removal

## TODO
- caching the model onnx sessions
- some other shit

sorry its my first time with react, typescript, and frontend things


