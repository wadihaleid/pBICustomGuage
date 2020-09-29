import { dataViewObjectsParser } from "powerbi-visuals-utils-dataviewutils";
import DataViewObjectsParser = dataViewObjectsParser.DataViewObjectsParser;
export declare class VisualSettings extends DataViewObjectsParser {
    gauge: GaugeSettings;
}
export declare class GaugeSettings {
    valueLabel: string;
    valueTooltip: string;
    target1Label: string;
    target2Label: string;
    target1Tooltip: string;
    target2Tooltip: string;
}
