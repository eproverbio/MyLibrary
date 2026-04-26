Put your future UI images in this folder.

Planned file paths:
- assets/ui/home-background.png
- assets/ui/logo-mylibrary.png
- assets/ui/home-video/home-background-loop.mp4
- assets/ui/button-vault.png
- assets/ui/button-manual.png
- assets/ui/button-look.png
- assets/ui/home-animation/frame-01.png
- assets/ui/home-animation/frame-02.png
- assets/ui/home-animation/frame-03.png
- assets/ui/home-animation/frame-04.png
- assets/ui/home-animation/frame-05.png
- assets/ui/home-animation/frame-06.png
- assets/ui/home-animation/frame-07.png
- assets/ui/home-animation/frame-08.png
- assets/ui/home-animation/frame-09.png
- assets/ui/home-animation/frame-10.png

When you are ready, we can wire these files into the home screen and buttons as real image backgrounds.
The `home-animation` folder already contains 10 tiny placeholder PNG files so the app can compile now.
Replace those exact files with your real animation frames to enable the animated home background.
The home logo is now read from `assets/ui/logo-mylibrary.png`.
Replace that exact file with your final transparent PNG logo.
For the looping video background, put the video file at `assets/ui/home-video/home-background-loop.mp4`.
Then set `homeBackgroundVideoSource` in `App.tsx` to `require("./assets/ui/home-video/home-background-loop.mp4")`
and switch `homeBackgroundMode` to `"video"`.
