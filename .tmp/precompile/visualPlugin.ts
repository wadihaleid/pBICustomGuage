import { CustomGauge } from "../../src/visual";
import powerbiVisualsApi from "powerbi-visuals-api"
import IVisualPlugin = powerbiVisualsApi.visuals.plugins.IVisualPlugin
import VisualConstructorOptions = powerbiVisualsApi.extensibility.visual.VisualConstructorOptions
var powerbiKey: any = "powerbi";
var powerbi: any = window[powerbiKey];

var pBICustomGuage628C5A2328964F43B86921677D9D07A3: IVisualPlugin = {
    name: 'pBICustomGuage628C5A2328964F43B86921677D9D07A3',
    displayName: 'PBICustomGuage',
    class: 'CustomGauge',
    apiVersion: '2.6.0',
    create: (options: VisualConstructorOptions) => {
        if (CustomGauge) {
            return new CustomGauge(options);
        }

        throw 'Visual instance not found';
    },
    custom: true
};

if (typeof powerbi !== "undefined") {
    powerbi.visuals = powerbi.visuals || {};
    powerbi.visuals.plugins = powerbi.visuals.plugins || {};
    powerbi.visuals.plugins["pBICustomGuage628C5A2328964F43B86921677D9D07A3"] = pBICustomGuage628C5A2328964F43B86921677D9D07A3;
}

export default pBICustomGuage628C5A2328964F43B86921677D9D07A3;