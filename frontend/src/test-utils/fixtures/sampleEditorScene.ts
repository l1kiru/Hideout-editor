import type { Scene } from '../../types/scene';

// Canonical, hand-crafted Scene used by the export-format test suite.
// Touch carefully: changes here ripple through buildExportPayload,
// editorSceneJsonValidate and exportHideout API tests.
export function sampleEditorScene(): Scene {
    return {
        scene_version: 2,
        camera_deg: 45,
        boundary: {
            points: [
                { x: 0, y: 0 },
                { x: 100, y: 0 },
                { x: 100, y: 80 },
                { x: 0, y: 80 },
            ],
        },
        template: { template_id: 'sample-tpl' },
        layers: [
            {
                kind: 'default',
                visible: true,
                locked: true,
                batches: [
                    {
                        template_name_ru: 'Тайник',
                        template_hash: 1,
                        placements: [{ x: 10, y: 10, r: 0 }],
                    },
                ],
            },
            {
                kind: 'user',
                title: 'Декор',
                visible: true,
                locked: false,
                batches: [
                    {
                        template_name_ru: 'Фаридунские верёвки 4',
                        template_hash: 1675705915,
                        facet_fv: 3,
                        line_stroke: true,
                        placements: [
                            { x: 20, y: 20, r: 0 },
                            { x: 22, y: 21, r: 8192 },
                            { x: 24, y: 22, r: 16384 },
                        ],
                    },
                ],
            },
        ],
        tool: {
            variant: 'select',
            draw_style: 'object',
            asset_key: 'faridun_ropes4',
            line_asset_key: 'faridun_ropes4',
            fill_asset_key: 'faridun_ropes4',
            spacing: 0,
            margin: 2,
            fv: 3,
            brush_width_view: 18,
            fill_step_world: 4,
            fill_max_placements: 120,
            fill_margin_world: -4,
            fill_mode: 'four_way',
            fill_connectivity: 4,
            fill_walls_scope: 'all_layers',
        },
        background: {
            path: '',
            opacity: 0.55,
            scale: 1,
            rotation_deg: 0,
            crop_left_pct: 0,
            crop_top_pct: 0,
            crop_right_pct: 100,
            crop_bottom_pct: 100,
            offset_x: 0,
            offset_y: 0,
            width_view_base: null,
            locked: false,
        },
        ui: {
            drawing_enabled: true,
            show_template_dots: true,
            placement_preview_scale: 1,
        },
        template_dots_cache: [
            { x: 1, y: 1 },
            { x: 2, y: 2 },
        ],
        hideout_map_display_name: 'Sample map',
        lineage_base_display_name: null,
    };
}
