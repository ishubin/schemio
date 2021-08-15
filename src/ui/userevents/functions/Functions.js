import SetFunction from './SetFunction';
import HideFunction from './HideFunction';
import ShowFunction from './ShowFunction';
import SendEventFunction from './SendEventFunction';
import ZoomToItFunction from './ZoomToItFunction';
import CrawlEffectFunction from './CrawlEffectFunction';
import StopAllAnimationsFunction from './StopAllAnimationsFunction';
import ItemParticleEffectFunction from './ItemParticleEffectFunction';
import BlinkEffectFunction from './BlinkEffectFunction';
import MoveFunction from './MoveFunction';
import MoveToItemFunction from './MoveToItemFunction';
import ReplaceItemFunction from './ReplaceItemFunction';
import RotateFunction from './RotateFunction';
import ScaleFunction from './ScaleFunction';
import MoveAlongPathFunction from './MoveAlongPathFunction';
import MoveRandomlyFunction from './MoveRandomlyFunction';
import WaitFunction from './WaitFunction';
import ToggleFunction from './ToggleFunction';
import UntoggleFunction from './UntoggleFunction';
import PlayFramesFunction from './PlayFramesFunction';
import StopFramePlayerFunction from './StopFramePlayerFunction';

export default {
    main: {
        hide:               HideFunction,
        show:               ShowFunction,
        set:                SetFunction,
        zoomToIt:           ZoomToItFunction,
        particleEffect:     ItemParticleEffectFunction,
        crawlEffect:        CrawlEffectFunction,
        blinkEffect:        BlinkEffectFunction,
        move:               MoveFunction,
        moveAlongPath:      MoveAlongPathFunction,
        moveToItem:         MoveToItemFunction,
        moveRandomly:       MoveRandomlyFunction,
        playFrames:         PlayFramesFunction,
        rotate:             RotateFunction,
        scale:              ScaleFunction,
        replaceItem:        ReplaceItemFunction,
        stopFramePlayer:    StopFramePlayerFunction,
        stopAllAnimations:  StopAllAnimationsFunction,
        sendEvent:          SendEventFunction,
        wait:               WaitFunction,
        toggle:             ToggleFunction,
        untoggle:           UntoggleFunction
    },
    scheme: {
    }
};
