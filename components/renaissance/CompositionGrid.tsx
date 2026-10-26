import shapes from "@/lib/renaissance/grid-shapes.json";

/** Original composition geometry and dashed strokes, rendered by React. */
export function CompositionGrid() {
  return (
    <div className="davinci-lines__container" aria-hidden="true">
      <svg
        className="composition-grid davinci-lines"
        viewBox="550 208 340 464"
        fill="none"
        data-active=""
        data-shown=""
        data-animating=""
      >
        <defs>
          <pattern
            id="dashed-stroke"
            patternUnits="userSpaceOnUse"
            width="4"
            height="1"
          >
            <rect width="1" height="1" fill="currentColor" opacity=".2" />
          </pattern>
          <pattern
            id="dashed-stroke-vertical"
            patternUnits="userSpaceOnUse"
            width="1"
            height="4"
          >
            <rect width="1" height="1" fill="currentColor" opacity=".2" />
          </pattern>
        </defs>
        <rect
          className="davinci-lines__loader"
          x="550"
          y="208"
          width="340"
          height="464"
          pathLength="1"
          strokeLinecap="square"
          stroke="currentColor"
        />
        <rect
          className="davinci-lines__complete"
          x="550"
          y="208"
          width="340"
          height="464"
          pathLength="1"
          strokeLinecap="square"
          stroke="currentColor"
        />
        {shapes.map(({ tag, attributes }) =>
          tag === "circle" ? (
            <circle key={attributes.id} {...attributes} />
          ) : (
            <path key={attributes.id} {...attributes} />
          ),
        )}
      </svg>
    </div>
  );
}
