declare module "mpris-service";
declare module "electron-vibrancy" {
  import { BrowserWindow } from "electron";

  declare type NSVisualEffectViewId = number;

  declare enum NVisualEffectMaterial {
    NSVisualEffectMaterialAppearanceBased = 0,
    NSVisualEffectMaterialLight = 1,
    NSVisualEffectMaterialDark = 2,
    NSVisualEffectMaterialTitlebar = 3,
    NSVisualEffectMaterialSelection = 4,
    NSVisualEffectMaterialMenu = 5,
    NSVisualEffectMaterialPopover = 6,
    NSVisualEffectMaterialSidebar = 7,
    NSVisualEffectMaterialMediumLight = 8,
    NSVisualEffectMaterialUltraDark = 9,
  }

  declare enum ResizeMask {
    AutoWidth = 0,
    AutoHeight = 1,
    AutoWidthHeight = 2,
    NoResize = 3,
  }

  /**
   * Enables or disables vibrancy for the WHOLE window. It will resize automatically. If you want something custom, see `AddView`. See [here](https://developer.apple.com/reference/appkit/nsvisualeffectmaterial?language=objc) for more info about `NSVisualEffectMaterial`.
   *
   * @param {BrowserWindow} window - `BrowserWindow` instance
   * @param {NVisualEffectMaterial} material - The Material for `NSVisualEffectMaterial`.
   * @returns {NSVisualEffectViewId}
   */
  declare function SetVibrancy(
    window: BrowserWindow,
    material: NVisualEffectMaterial,
  ): NSVisualEffectViewId;

  /**
   * Disables Vibrancy completely.
   *
   * @param {BrowserWindow} window - The Electron `BrowserWindow` instance
   */
  declare function DisableVibrancy(window: BrowserWindow): void;

  /**
   * Adds a NSVisualEffectView to the window with the specified properties. If you don't specify a ResizeMask, the default value for it is 2.
   *
   * @param {BrowserWindow} window - The Electron `BrowserWindow` to attach the visual effect view to.
   * @param {Object} options - Configuration for the visual effect view's appearance and positioning.
   * @param {NVisualEffectMaterial} options.Material - The material style for the visual effect view.
   * @param {number} options.X - X Position of the `NSVisualEffectView` relative to the main `BrowserWindow`.
   * @param {number} options.Y - Y Position of the `NSVisualEffectView` relative to the main `BrowserWindow`.
   * @param {number} options.Width - Integer Width of the `NSVisualEffectView`. Should not be larger than the window's.
   * @param {number} options.Height - Integer Height of the `NSVisualEffectView`. Should not be larger than the window's.
   * @param {ResizeMask} options.ResizeMask - Resize mask for the `NSVisualEffectView`, controlling its behavior when the window is resized.
   * @returns {NSVisualEffectViewId} View id of `NSVisualEffectView`. You need this for `UpdateView` or `RemoveView`.
   */
  declare function AddView(
    window: BrowserWindow,
    options: {
      Material: NVisualEffectMaterial;
      X: number;
      Y: number;
      Width: number;
      Height: number;
      ResizeMask: ResizeMask;
    },
  ): NSVisualEffectViewId;

  /**
   * Updates the `NSVisualEffectView` with the specified properties.
   *
   * @param {BrowserWindow} window - The Electron `BrowserWindow` to attach the visual effect view to.
   * @param {Object} options - Configuration for the visual effect view's appearance and positioning.
   * @param {NSVisualEffectViewId} options.ViewId - Integer. Return value from `AddView`.
   * @param {NVisualEffectMaterial} options.Material - The material style for the visual effect view.
   * @param {number} options.X - X Position of the `NSVisualEffectView` relative to the main `BrowserWindow`.
   * @param {number} options.Y - Y Position of the `NSVisualEffectView` relative to the main `BrowserWindow`.
   * @param {number} options.Width - Integer Width of the `NSVisualEffectView`. Should not be larger than the window's.
   * @param {number} options.Height - Integer Height of the `NSVisualEffectView`. Should not be larger than the window's.
   * @returns {boolean}
   */
  declare function UpdateView(
    window: BrowserWindow,
    options: {
      ViewId: NSVisualEffectViewId;
      Material: NVisualEffectMaterial;
      X: number;
      Y: number;
      Width: number;
      Height: number;
    },
  ): boolean;

  /**
   * Removes the `NSVisualEffectView`.
   *
   * @param {BrowserWindow} window - The Electron `BrowserWindow` instance
   * @param {NSVisualEffectViewId} ViewId - Identifier of `NSVisualEffectView`.
   * @constructor
   */
  declare function DisableVibrancy(
    window: BrowserWindow,
    ViewId: NSVisualEffectViewId,
  ): void;
}
