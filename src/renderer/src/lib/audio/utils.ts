export function createCurve(
  manipulator: Array<number>,
  count: number,
): Array<number> {
  if (count <= 0) return [];

  const sourceLength = manipulator.length;
  const targetLength = count;

  if (targetLength >= sourceLength) {
    const multiplier = targetLength / sourceLength;
    const curve: Array<number> = [];

    for (let i = 0; i < sourceLength; i++) {
      const steps = Math.min(
        targetLength - curve.length,
        Math.ceil(multiplier),
      );

      for (let j = 0; j < steps; j++) {
        curve.push(
          curve.length > 0
            ? (curve[curve.length - 1] + manipulator[i]) / 2
            : manipulator[i],
        );
      }
    }
    return curve.slice(0, targetLength);
  }

  const reductionFactor = sourceLength / targetLength;
  const curve: Array<number> = [];

  for (let i = 0; i < targetLength; i++) {
    const startIndex = Math.floor(i * reductionFactor);
    const endIndex = Math.min(
      Math.floor((i + 1) * reductionFactor),
      sourceLength,
    );

    let sum = 0;
    for (let j = startIndex; j < endIndex; j++) {
      sum += manipulator[j];
    }

    const segmentLength = endIndex - startIndex;
    const average = segmentLength > 0 ? sum / segmentLength : 0;

    curve.push(average);
  }

  return curve;
}

export function killBrowserMediaSession(audio: HTMLAudioElement) {
  function suppressWebviewSession() {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = null;

      const noop = () => {};
      (
        [
          "play",
          "pause",
          "seekbackward",
          "seekforward",
          "previoustrack",
          "nexttrack",
        ] as const
      ).forEach((action) =>
        navigator.mediaSession.setActionHandler(action, noop),
      );

      navigator.mediaSession.setPositionState({
        duration: 0,
        playbackRate: 1,
        position: 0,
      });
    }
  }

  audio.addEventListener("play", suppressWebviewSession);
  audio.addEventListener("loadedmetadata", suppressWebviewSession);
  window.removeEventListener("load", suppressWebviewSession);
  window.addEventListener("load", suppressWebviewSession);
}
