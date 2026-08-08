# Spatial Workspace & Design System Specification

> **Repository**: `NYC-R3-FRONTEND`  
> **Module**: Spatial Canvas Engine & Glassmorphic UI  

---

## 1. Spatial Coordinate System & Transforms

The spatial canvas operates on a continuous 2D Cartesian coordinate plane:
- **Pan Transform**: `pan.x`, `pan.y` pixel offsets controlling display matrix translation.
- **Zoom Scale**: `zoom` factor constrained between `0.5x` (zoom out) and `2.0x` (zoom in).
- **Auto-Centering Matrix**: On initial workspace mount, the viewport calculates matrix centering:
  ```typescript
  setPan({
    x: (window.innerWidth - 1100) / 2,
    y: (window.innerHeight - 450) / 2
  });
  ```

---

## 2. Spatial Proximity & Clustering Engine

Spatial arrangement serves as implicit semantic context in Intent Canvas.

### Proximity Formula
Given two nodes $N_1(x_1, y_1)$ and $N_2(x_2, y_2)$ with widths $W$ and heights $H$:
$$C_1 = \left(x_1 + \frac{W_1}{2}, y_1 + \frac{H_1}{2}\right), \quad C_2 = \left(x_2 + \frac{W_2}{2}, y_2 + \frac{H_2}{2}\right)$$
$$\text{Distance}(N_1, N_2) = \sqrt{(C_{2x} - C_{1x})^2 + (C_{2y} - C_{1y})^2}$$

### Spatial Cluster Threshold
- Nodes with $\text{Distance} \le 240\text{px}$ are grouped into an implicit `SpatialCluster`.
- In-canvas floating **Spatial Cluster Tags** highlight proximity groups (`<240px Auto-Linked Context`).

---

## 3. SVG Bezier Connector Rendering

Explicit relationship lines between nodes are rendered as dynamic Cubic Bezier curves in an SVG overlay (`CanvasSVGEdges.tsx`).

### Curve Geometry
For source node center $(x_1, y_1)$ and target node center $(x_2, y_2)$:
- **Control Point 1**: $(x_1 + \frac{\Delta x}{2}, y_1)$
- **Control Point 2**: $(x_2 - \frac{\Delta x}{2}, y_2)$
- **Path Command**: `M x1 y1 C (x1+dx/2) y1, (x2-dx/2) y2, x2 y2`
- **Midpoint Formula ($t = 0.5$)**:
  $$X(0.5) = 0.125 x_1 + 0.375 C_{1x} + 0.375 C_{2x} + 0.125 x_2$$
  $$Y(0.5) = 0.125 y_1 + 0.375 C_{1y} + 0.375 C_{2y} + 0.125 y_2$$
  Relationship labels (`explicit_connector`, `spatial_proximity`) are positioned precisely at $(X(0.5), Y(0.5))$.

---

## 4. Glassmorphic Design System Tokens

The visual system adheres to high-tech smoked glass aesthetics:

| Token Category | Token Value | Applied Class / Property |
| :--- | :--- | :--- |
| **Canvas Base** | `#040406` (Pitch Obsidian) | `bg-[#040406]` |
| **Glass Surface** | `#090a0f`/85 (Smoked Graphite) | `bg-[#090a0f]/85 backdrop-blur-2xl` |
| **Hairline Border** | `rgba(255,255,255,0.08)` | `border-white/[0.08]` |
| **Mint Accent** | `#00ff87` / `#24ff95` | `text-[#00ff87] border-[#00ff87]/40` |
| **Amber Alert** | `#ffb703` | `text-amber-400 border-amber-500/30` |
| **Grid Overlay** | Sub-pixel 32px radial dot grid | `background-image: radial-gradient(...)` |
