import bpy
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT_PNG = ROOT / "assets_pipeline" / "outputs" / "png" / "coin_icon.png"
OUT_GLB = ROOT / "assets_pipeline" / "outputs" / "glb" / "coin.glb"


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def make_material(name, color, metallic=0.0, roughness=0.35):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True

    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness

    return mat


def create_coin():
    gold = make_material("soft_gold", (1.0, 0.68, 0.18, 1.0), metallic=0.7, roughness=0.28)
    dark_gold = make_material("dark_gold", (0.75, 0.42, 0.08, 1.0), metallic=0.6, roughness=0.35)

    bpy.ops.mesh.primitive_cylinder_add(
        vertices=96,
        radius=1.4,
        depth=0.22,
        location=(0, 0, 0),
    )
    coin = bpy.context.object
    coin.name = "Reward Coin"
    coin.data.materials.append(gold)

    bpy.ops.mesh.primitive_torus_add(
        major_radius=1.18,
        minor_radius=0.055,
        major_segments=96,
        minor_segments=12,
        location=(0, 0, 0.13),
    )
    rim = bpy.context.object
    rim.name = "Raised Rim"
    rim.data.materials.append(dark_gold)

    bpy.ops.mesh.primitive_cone_add(
        vertices=5,
        radius1=0.48,
        radius2=0.18,
        depth=0.08,
        location=(0, 0, 0.19),
    )
    star = bpy.context.object
    star.name = "Simple Star"
    star.rotation_euler[2] = math.radians(18)
    star.scale.y = 0.72
    star.data.materials.append(dark_gold)


def setup_camera_and_lights():
    bpy.ops.object.light_add(type="AREA", location=(0, -3.2, 4.0))
    light = bpy.context.object
    light.name = "Softbox"
    light.data.energy = 500
    light.data.size = 5

    bpy.ops.object.camera_add(
        location=(0, -4.2, 2.8),
        rotation=(math.radians(58), 0, 0),
    )
    camera = bpy.context.object
    bpy.context.scene.camera = camera
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 3.5


def setup_render():
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 64
    scene.render.resolution_x = 512
    scene.render.resolution_y = 512
    scene.render.film_transparent = True
    scene.view_settings.view_transform = "Filmic"
    scene.view_settings.look = "Medium High Contrast"
    scene.view_settings.exposure = 0
    scene.view_settings.gamma = 1


def export_assets():
    OUT_PNG.parent.mkdir(parents=True, exist_ok=True)
    OUT_GLB.parent.mkdir(parents=True, exist_ok=True)

    bpy.context.scene.render.filepath = str(OUT_PNG)
    bpy.ops.render.render(write_still=True)

    bpy.ops.export_scene.gltf(
        filepath=str(OUT_GLB),
        export_format="GLB",
        export_apply=True,
    )


def main():
    clear_scene()
    create_coin()
    setup_camera_and_lights()
    setup_render()
    export_assets()


if __name__ == "__main__":
    main()
