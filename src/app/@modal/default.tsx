// Default slot for the @modal parallel route.
// Returns null when no Drawer is active (so intercepting routes can
// render their UI without overlapping with non-modal content).
export default function DefaultModalSlot(): null {
  return null;
}