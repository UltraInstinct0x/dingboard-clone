# dingboard-clone
https://mahikgot.github.io/dingboard-clone/

only tested on chrome
## Implemented
- image segmentation (use first button, then click on part you want to segment)
  - clientside both encoder + decoder of MobileSAM using ONNX.
  - uses WEBGPU by default, fallback to CPU if not available (slow)

## TODO
- inpainting
- background removal
- copy/paste images to and from canvas
- caching the model onnx sessions
- localstorage of canvas state
- undo/redo
- some other shit

## NOTES
- enable cross-origin isolation for onnx multithreading using vite headers and by using code from [this guy](https://github.com/josephrocca/clip-image-sorter) to enable it for github pages.

sorry its my first time with react, typescript, and frontend things

DRAG&DROP images from your computer only for now

