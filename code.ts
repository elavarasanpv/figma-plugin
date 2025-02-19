figma.showUI(__html__, { width: 400, height: 500 });

type StrokeAlign = 'INSIDE' | 'OUTSIDE' | 'CENTER'; // Fix for StrokeAlign type

type ExtractedNodeData = {
  id: string;
  name: string;
  type: SceneNode['type'];
  width: number;
  height: number;
  fills: Paint[];
  strokeWeight?: number | typeof figma.mixed;
  strokeAlign?: StrokeAlign; // Correct type for strokeAlign
  strokes?: Paint[];
  opacity?: number;
  blendMode?: BlendMode;
  cornerRadius?: number | typeof figma.mixed;
  text?: string;
  attributes?: Record<string, any>;
  children?: ExtractedNodeData[];
};

figma.on("run", async () => {
  console.log("Plugin started...");

  const selection = figma.currentPage.selection;
  console.log("Selected Nodes:", selection.length);

  if (!selection.length) {
    figma.ui.postMessage({ type: "error", message: "No layers selected." });
    console.log("No layers selected.");
    return;
  }

  console.log("Extracting node data...");
  const extractedNodes: ExtractedNodeData[] = selection.map(node => extractNodeData(node));

  console.log("Extracted Nodes (Before Cleaning):", extractedNodes);

  // ✅ Fix: Remove non-serializable values
  const cleanedNodes = JSON.parse(JSON.stringify(extractedNodes));

  console.log("Extracted Nodes (After Cleaning):", cleanedNodes);
   const localVariables = await figma.variables.getLocalVariablesAsync('STRING'); // filters local variables by the 'STRING' type
   const variable = await figma.variables.getVariableByIdAsync(
         "VariableID:e172ccf68b7842151b3737bbf68dd37eef88613f/14505:500"
        );
        console.log(variable?.name,'local',localVariables, "variable");

  figma.ui.postMessage({ type: "nodes", data: cleanedNodes });
  console.log("Post message");
});

function extractNodeData(node: SceneNode): ExtractedNodeData {
  const extracted: ExtractedNodeData = {
    id: node.id,
    name: node.name,
    type: node.type,
    width: node.width,
    height: node.height,
    fills: 'fills' in node ? sanitizeValue(node.fills) : [],
    strokeWeight: 'strokeWeight' in node ? node.strokeWeight : undefined,
    strokeAlign: 'strokeAlign' in node ? node.strokeAlign : undefined,
    strokes: 'strokes' in node ? sanitizeValue(node.strokes) : [],
    opacity: 'opacity' in node ? node.opacity : undefined,
    blendMode: 'blendMode' in node ? node.blendMode : undefined,
    cornerRadius: 'cornerRadius' in node ? node.cornerRadius : undefined,
    text: node.type === "TEXT" ? (node as TextNode).characters : undefined,
    attributes: {},
    children: [],
  };

  if ('componentPropertyDefinitions' in node) {
    extracted.attributes = Object.keys(node.componentPropertyDefinitions).reduce((attrs, key) => {
      attrs[key] = sanitizeValue(node.componentPropertyDefinitions[key].defaultValue);
      return attrs;
    }, {} as Record<string, any>);
  }

  if ('layoutMode' in node || 'primaryAxisSizingMode' in node || 'counterAxisSizingMode' in node) {
    extracted.attributes = {
      ...extracted.attributes,
      layoutMode: 'layoutMode' in node ? node.layoutMode : undefined,
      primaryAxisSizingMode: 'primaryAxisSizingMode' in node ? node.primaryAxisSizingMode : undefined,
      counterAxisSizingMode: 'counterAxisSizingMode' in node ? node.counterAxisSizingMode : undefined,
    };
  }

  if ('children' in node && node.children) {
    extracted.children = node.children.map(child => extractNodeData(child));
  }

  return extracted;
}

// ✅ Function to Remove Symbols and Unserializable Data
function sanitizeValue(value: any): any {
  if (typeof value === "symbol") {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (typeof value === "object" && value !== null) {
   const sanitizedObject: Record<string, any> = {};
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        sanitizedObject[key] = sanitizeValue(value[key]);
      }
    }
    return sanitizedObject;
  }
  return value;
}

figma.on("close", () => figma.closePlugin());

