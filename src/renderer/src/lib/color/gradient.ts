/**
 * Interface representing a single color stop in the gradient.
 * The offset is a number between 0.0 and 1.0.
 */
interface ColorStop {
  offset: number;
  color: string;
}

/**
 * A class to manage a Canvas Linear Gradient, allowing access to its definition
 * for generating a corresponding CSS linear-gradient string.
 */
export class LinearGradientTracker {
  // The actual CanvasGradient object used for rendering.
  private readonly canvasGradient: CanvasGradient;

  // Internal storage of color stops, which is readable.
  private stops: ColorStop[] = [];

  // Coordinates used to create the linear gradient.
  private readonly x0: number;
  private readonly y0: number;
  private readonly x1: number;
  private readonly y1: number;

  /**
   * Initializes the tracker and creates the CanvasGradient object.
   * @param ctx The 2D rendering context of the canvas.
   * @param x0 The starting x-coordinate of the gradient.
   * @param y0 The starting y-coordinate of the gradient.
   * @param x1 The ending x-coordinate of the gradient.
   * @param y1 The ending y-coordinate of the gradient.
   */
  constructor(
    ctx: CanvasRenderingContext2D,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
  ) {
    this.x0 = x0;
    this.y0 = y0;
    this.x1 = x1;
    this.y1 = y1;
    this.canvasGradient = ctx.createLinearGradient(x0, y0, x1, y1);
  }

  /**
   * Adds a color stop to both the internal definition and the CanvasGradient object.
   * @param offset A number between 0 and 1.
   * @param color A CSS color string (e.g., 'red', '#ff0000', 'rgba(0, 0, 0, 0.5)').
   */
  public addColorStop(offset: number, color: string): void {
    // 1. Add to the actual CanvasGradient object
    this.canvasGradient.addColorStop(offset, color);

    // 2. Add to the readable internal definition
    this.stops.push({ offset, color });
  }

  /**
   * Retrieves the CanvasGradient object for use in ctx.fillStyle or ctx.strokeStyle.
   * @returns The CanvasGradient object.
   */
  public getCanvasGradient(): CanvasGradient {
    return this.canvasGradient;
  }

  /**
   * Generates a CSS linear-gradient string corresponding to the gradient definition.
   * * NOTE: Calculating the exact CSS angle from Canvas coordinates (x0, y0, x1, y1)
   * is complex. This method provides a simplified string focused on color stops
   * for easy use, defaulting to a horizontal direction if coordinates allow.
   * For full compatibility, calculating the angle using atan2 is required.
   * @returns The CSS linear-gradient string.
   */
  public getCssString(): string {
    if (this.stops.length === 0) {
      return "linear-gradient(to right, #ffffff, #000000)"; // Default fallback
    }

    // Sort stops by offset to ensure CSS compatibility
    const sortedStops = this.stops.sort((a, b) => a.offset - b.offset);

    // Format the color stops: "color offset%"
    const stopStrings = sortedStops.map(
      (stop) => `${stop.color} ${Math.round(stop.offset * 100)}%`,
    );

    // Determine approximate CSS direction (for demonstration simplicity)
    let direction = "to right";
    if (this.x0 === this.x1) {
      // Vertical gradient
      direction = this.y0 < this.y1 ? "to bottom" : "to top";
    } else if (this.y0 === this.y1) {
      // Horizontal gradient
      direction = this.x0 < this.x1 ? "to right" : "to left";
    }
    // For diagonal or general cases, a true angle calculation would be needed:
    // const angle = Math.atan2(this.y1 - this.y0, this.x1 - this.x0) * 180 / Math.PI;
    // direction = `${Math.round(angle) + 90}deg`;

    return `linear-gradient(${direction}, ${stopStrings.join(", ")})`;
  }
}
