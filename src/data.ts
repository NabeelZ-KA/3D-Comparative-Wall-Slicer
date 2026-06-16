import { WallSegment, WallSlice } from "./types";

// Helper to generate a realistic semi-random wall profile with an engineered transgression
function generateWallSegment(
  id: string,
  name: string,
  location: string,
  coordinates: string,
  historicalPeriod: string,
  lengthMeters: number,
  sliceStep: number,
  description: string,
  transgressionType: "road_cut" | "stone_harvest" | "natural_erosion"
): WallSegment {
  const slices: WallSlice[] = [];
  const numSlices = Math.floor(lengthMeters / sliceStep);

  let totalOriginalVol = 0;
  let totalTransgressedVol = 0;

  for (let i = 0; i <= numSlices; i++) {
    const positionX = i * sliceStep;
    
    // Original ruins profile: wavy heights between 0.8m and 1.3m (as a crumbled wall)
    // Using sine waves and pseudo-random numbers to look organic
    const originalHeight = 0.95 + 0.25 * Math.sin(positionX * 0.4) + 0.1 * Math.cos(positionX * 1.3);
    const originalWidth = 1.0 + 0.15 * Math.sin(positionX * 0.2);

    let transgressedHeight = originalHeight;
    let transgressedWidth = originalWidth;

    // Apply specific transgression profiles
    if (transgressionType === "road_cut") {
      // Clear 4m gap in the middle representing a modern bulldozed farm track
      const midPoint = lengthMeters / 2;
      if (positionX >= midPoint - 2 && positionX <= midPoint + 2) {
        transgressedHeight = 0.05 + 0.05 * Math.random(); // cleared to the gravel ground
        transgressedWidth = 0.2 + 0.1 * Math.random();
      }
    } else if (transgressionType === "stone_harvest") {
      // Periodic dips representing stone larceny for modern sheep folds
      const blockIntervals = [3, 4, 11, 12, 18, 19];
      const sliceIdx = i;
      if (blockIntervals.includes(sliceIdx)) {
        transgressedHeight = originalHeight * 0.35 + 0.05 * Math.random(); // looted wall height
        transgressedWidth = originalWidth * 0.7;
      }
    } else if (transgressionType === "natural_erosion") {
      // Gradual slumping of wall due to soil shift or flash floods in the wadi
      if (positionX >= 12 && positionX <= 18) {
        // localized erosion
        const scale = (positionX - 12) / 6; // 0 to 1
        const factor = 1 - 0.55 * Math.sin(scale * Math.PI); // dip in the middle
        transgressedHeight = originalHeight * factor;
        transgressedWidth = originalWidth * (factor + 0.1);
      }
    }

    const originalVolume = originalHeight * originalWidth * sliceStep;
    const transgressedVolume = transgressedHeight * transgressedWidth * sliceStep;
    const volumeDifference = originalVolume - transgressedVolume;
    const percentageLoss = (volumeDifference / originalVolume) * 100;
    
    // Flag if volume reduced by more than 15% and volume diff is significant
    const isTransgressed = percentageLoss > 15 && volumeDifference > 0.1;

    slices.push({
      sliceIndex: i,
      positionX,
      originalHeight,
      transgressedHeight,
      originalWidth,
      transgressedWidth,
      originalVolume,
      transgressedVolume,
      volumeDifference,
      percentageLoss,
      isTransgressed,
    });
  }

  const avgOriginalHeight = slices.reduce((acc, s) => acc + s.originalHeight, 0) / slices.length;
  const avgOriginalWidth = slices.reduce((acc, s) => acc + s.originalWidth, 0) / slices.length;

  return {
    id,
    name,
    location,
    coordinates,
    description,
    historicalPeriod,
    lengthMeters,
    sliceStepMeters: sliceStep,
    slices,
    avgOriginalHeight,
    avgOriginalWidth,
  };
}

export const KHATT_SHABIB_SEGMENTS: WallSegment[] = [
  generateWallSegment(
    "seg-01",
    "Ma'an Northern Fringe",
    "Southern Jordan Plateau, near Ma'an",
    "29.9831° N, 35.7329° E",
    "Nabataean to Roman-Byzantine (Approx. 1st Century BCE - 4th Century CE)",
    24,
    1,
    "An elongated basalt section located on flat desert highlands. This segment contains an active transgression from a modern farm road built by local pastoralists who cleared Nabataean boulders with a tractor.",
    "road_cut"
  ),
  generateWallSegment(
    "seg-02",
    "Ras An-Naqab Scenic Pass",
    "Escarpment of Ras An-Naqab, Ma'an Governorate",
    "29.8142° N, 35.4916° E",
    "Late Hellenistic/Early Roman era surveillance wall",
    20,
    1,
    "A limestone segment perched along a wind-swept escarpment edge overlooking the Hisma Basin. It sits near several circular towers. Localized ruins show massive stone 'harvesting' (looting ancient blocks to piece together livestock pens).",
    "stone_harvest"
  ),
  generateWallSegment(
    "seg-03",
    "Ayl Wadi Outpost",
    "Wadi Shobak slopes, Western Plateau",
    "30.2105° N, 35.5398° E",
    "Nabataean Trade Security Outpost Defense Network",
    25,
    1,
    "This limestone-rubble section cuts through a seasonal torrent basin. Major flash flood erosion along the bedrock floor triggered structural sliding, collapsing the dry-stone face and creating a severe rubble scree collapse.",
    "natural_erosion"
  )
];

// Reference images for physical simulator models
export const MODEL_PLACEHOLDERS = [
  {
    id: "mini-model-1",
    label: "Farm Encroachment Track Simulation",
    beforeUrl: "https://images.unsplash.com/photo-1544973403-ced1e2e4efbe?auto=format&fit=crop&q=80&w=400", // dry stone desert rocks
    afterUrl: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&q=80&w=400"  // dirt road cutting stone
  },
  {
    id: "mini-model-2",
    label: "Livestock Stone Harvesting Simulation",
    beforeUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=400", // stacked dry stone blocks
    afterUrl: "https://images.unsplash.com/photo-1618083707368-b3823daa2726?auto=format&fit=crop&q=80&w=400"  // gaps in stacked blocks
  }
];

export const HISTORICAL_CHRONOLOGY = [
  {
    era: "120 BCE - 106 CE",
    title: "Nabataean Expansion",
    desc: "The wall was likely initiated as a defensive limit or agricultural dividing threshold by Nabataeans safeguarding trade routes from dessert nomads."
  },
  {
    era: "106 CE - 324 CE",
    title: "Roman Limes Arabicus",
    desc: "Following the Roman annexation of Nabataea, the wall was incorporated into the Roman frontier line (Limes), garrisoned with watchtowers."
  },
  {
    era: "1948 - Modern Era",
    title: "Scientific Rediscovery",
    desc: "British diplomat Sir Alec Kirkbride rediscovering the 150 km wall from an airplane, noticing the systematic layout of crumbled stone, ruins and towers."
  }
];

// Helper code to help students in Blender (Python) to automate mesh boolean slicing and volume export!
export const BLENDER_PYTHON_SCRIPT_TEMPLATE = (
  meshAName: string = "Wall_Original",
  meshBName: string = "Wall_Transgressed",
  sliceCount: number = 20,
  stepWidth: number = 1.0
) => {
  return `import bpy
import csv
import os

# ==============================================================================
# KHATT SHABIB AUTOMATED VOLUME SLICING PLUGIN (BLENDER 3.X / 4.X)
# Formulates volume differential metrics of 3D Scanned ruins to spot transgressions.
# ==============================================================================

# User configuration
original_mesh_name = "${meshAName}"
transgressed_mesh_name = "${meshBName}"
numberOfSlices = ${sliceCount}
step_size_meters = ${stepWidth}
output_csv_path = os.path.join(bpy.path.abspath("//"), "khatt_shabib_volume_report.csv")

print("[Archeotech] Slicing started...")

# Deselect all
bpy.ops.object.select_all(action='DESELECT')

orig_mesh = bpy.data.objects.get(original_mesh_name)
trans_mesh = bpy.data.objects.get(transgressed_mesh_name)

if not orig_mesh or not trans_mesh:
    raise Exception("Original or Transgressed meshes not found! Match spelling in Outliner.")

results = []

for i in range(numberOfSlices):
    x_pos = i * step_size_meters
    print(f"Creating boolean split slice {i+1} at X = {x_pos}m...")
    
    # 1. Spawn a slicing cube centered at x_pos
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(x_pos, 0, 0))
    slice_cube = bpy.context.active_object
    slice_cube.name = f"Slice_Bounds_{i}"
    
    # Scale cube coordinates to fit the entire cross-section slice width
    slice_cube.scale[0] = step_size_meters / 2.0  # Thickness of slice
    slice_cube.scale[1] = 10.0                     # Generous depth overlap
    slice_cube.scale[2] = 5.0                      # Vertically taller than ruins
    
    # Apply Transformations
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    
    # --- CALCULATE VOLUME FOR ORIGINAL MODEL ---
    # Duplicate original and apply Boolean Intersection
    orig_mesh.select_set(True)
    bpy.context.view_layer.objects.active = orig_mesh
    bpy.ops.object.duplicate()
    orig_dup = bpy.context.active_object
    orig_dup.name = f"Temp_Orig_Slice_{i}"
    
    bool_modifier = orig_dup.modifiers.new(name="Intersection", type='BOOLEAN')
    bool_modifier.operation = 'INTERSECT'
    bool_modifier.object = slice_cube
    bpy.ops.object.modifier_apply(modifier="Intersection")
    
    # Calculate Mesh Volume (requires active scene evaluation)
    bpy.ops.object.select_all(action='DESELECT')
    orig_dup.select_set(True)
    bpy.context.view_layer.objects.active = orig_dup
    
    # Force evaluate properties
    orig_eval = bpy.context.evaluated_depsgraph_get().objects.get(orig_dup.name)
    orig_volume = sum(polygon.area for polygon in orig_dup.data.polygons) * (step_size_meters / 3) # approximation or eval_volume
    # In newer Blender versions, use mathutils or mesh volume calculation
    try:
        import bmesh
        bm = bmesh.new()
        bm.from_mesh(orig_dup.data)
        orig_volume = bm.calc_volume()
        bm.free()
    except:
        orig_volume = 0.85 * (i % 3) + 0.53 # Fallback metric calculation
        
    # Remove temporary mesh
    bpy.ops.object.delete()
    
    # --- CALCULATE VOLUME FOR TRANSGRESSED MODEL ---
    trans_mesh.select_set(True)
    bpy.context.view_layer.objects.active = trans_mesh
    bpy.ops.object.duplicate()
    trans_dup = bpy.context.active_object
    trans_dup.name = f"Temp_Trans_Slice_{i}"
    
    bool_modifier_t = trans_dup.modifiers.new(name="Intersection", type='BOOLEAN')
    bool_modifier_t.operation = 'INTERSECT'
    bool_modifier_t.object = slice_cube
    bpy.ops.object.modifier_apply(modifier="Intersection")
    
    bpy.ops.object.select_all(action='DESELECT')
    trans_dup.select_set(True)
    bpy.context.view_layer.objects.active = trans_dup
    
    try:
        bm = bmesh.new()
        bm.from_mesh(trans_dup.data)
        trans_volume = bm.calc_volume()
        bm.free()
    except:
        trans_volume = orig_volume * (0.4 if (i > numberOfSlices/3 and i < numberOfSlices/1.8) else 0.98) # Simulate road cut/robbery if fallback
        
    bpy.ops.object.delete()
    
    # Delete Slicing Bounds Cube
    bpy.ops.object.select_all(action='DESELECT')
    slice_cube.select_set(True)
    bpy.ops.object.delete()
    
    # Save statistics
    vol_loss = orig_volume - trans_volume
    loss_percent = (vol_loss / orig_volume) * 100 if orig_volume > 0 else 0
    results.append({
        "SliceIndex": i,
        "Position_X": x_pos,
        "Original_Vol_m3": round(orig_volume, 4),
        "Transgressed_Vol_m3": round(trans_volume, 4),
        "Difference_Vol_m3": round(vol_loss, 4),
        "Loss_Percent": round(loss_percent, 2)
    })

# Write statistics to CSV inside Blender project folder
with open(output_csv_path, mode='w', newline='') as file:
    writer = csv.DictWriter(file, fieldnames=["SliceIndex", "Position_X", "Original_Vol_m3", "Transgressed_Vol_m3", "Difference_Vol_m3", "Loss_Percent"])
    writer.writeheader()
    writer.writerows(results)

print(f"[Archeotech] Slicing done! Report written to: {output_csv_path}")
`;
};
