import React, { PureComponent } from 'react';
import $ from 'jquery';

import {
  ValueMapping,
  Threshold,
  ThemeName,
  MappingType,
  BasicGaugeColor,
  ThemeNames,
  ValueMap,
  RangeMap,
} from '../../types/panel';
import { TimeSeriesVMs } from '../../types/series';
import { getValueFormat } from '../../utils/valueFormats/valueFormats';

type TimeSeriesValue = string | number | null;

export interface Props {
  decimals: number;
  height: number;
  valueMappings: ValueMapping[];
  maxValue: number;
  minValue: number;
  prefix: string;
  timeSeries: TimeSeriesVMs;
  thresholds: Threshold[];
  showThresholdMarkers: boolean;
  showThresholdLabels: boolean;
  stat: string;
  suffix: string;
  unit: string;
  width: number;
  theme?: ThemeName;
}

export class Gauge extends PureComponent<Props> {
  canvasElement: any;

  static defaultProps = {
    maxValue: 100,
    valueMappings: [],
    minValue: 0,
    prefix: '',
    showThresholdMarkers: true,
    showThresholdLabels: false,
    suffix: '',
    thresholds: [],
    unit: 'none',
    stat: 'avg',
    theme: ThemeNames.Dark,
  };

  componentDidMount() {
    this.draw();
  }

  componentDidUpdate() {
    this.draw();
  }

  addValueToTextMappingText(allValueMappings: ValueMapping[], valueToTextMapping: ValueMap, value: TimeSeriesValue) {
    if (!valueToTextMapping.value) {
      return allValueMappings;
    }

    const valueAsNumber = parseFloat(value as string);
    const valueToTextMappingAsNumber = parseFloat(valueToTextMapping.value as string);

    if (isNaN(valueAsNumber) || isNaN(valueToTextMappingAsNumber)) {
      return allValueMappings;
    }

    if (valueAsNumber !== valueToTextMappingAsNumber) {
      return allValueMappings;
    }

    return allValueMappings.concat(valueToTextMapping);
  }

  addRangeToTextMappingText(allValueMappings: ValueMapping[], rangeToTextMapping: RangeMap, value: TimeSeriesValue) {
    if (!rangeToTextMapping.from || !rangeToTextMapping.to || !value) {
      return allValueMappings;
    }

    const valueAsNumber = parseFloat(value as string);
    const fromAsNumber = parseFloat(rangeToTextMapping.from as string);
    const toAsNumber = parseFloat(rangeToTextMapping.to as string);

    if (isNaN(valueAsNumber) || isNaN(fromAsNumber) || isNaN(toAsNumber)) {
      return allValueMappings;
    }

    if (valueAsNumber >= fromAsNumber && valueAsNumber <= toAsNumber) {
      return allValueMappings.concat(rangeToTextMapping);
    }

    return allValueMappings;
  }

  getAllFormattedValueMappings(valueMappings: ValueMapping[], value: TimeSeriesValue) {
    const allFormattedValueMappings = valueMappings.reduce(
      (allValueMappings, valueMapping) => {
        if (valueMapping.type === MappingType.ValueToText) {
          allValueMappings = this.addValueToTextMappingText(allValueMappings, valueMapping as ValueMap, value);
        } else if (valueMapping.type === MappingType.RangeToText) {
          allValueMappings = this.addRangeToTextMappingText(allValueMappings, valueMapping as RangeMap, value);
        }

        return allValueMappings;
      },
      [] as ValueMapping[]
    );

    allFormattedValueMappings.sort((t1, t2) => {
      return t1.id - t2.id;
    });

    return allFormattedValueMappings;
  }

  getFirstFormattedValueMapping(valueMappings: ValueMapping[], value: TimeSeriesValue) {
    return this.getAllFormattedValueMappings(valueMappings, value)[0];
  }

  formatValue(value: TimeSeriesValue) {
    const { decimals, valueMappings, prefix, suffix, unit } = this.props;

    if (isNaN(value as number)) {
      return value;
    }

    if (valueMappings.length > 0) {
      const valueMappedValue = this.getFirstFormattedValueMapping(valueMappings, value);
      if (valueMappedValue) {
        return `${prefix} ${valueMappedValue.text} ${suffix}`;
      }
    }

    const formatFunc = getValueFormat(unit);
    const formattedValue = formatFunc(value as number, decimals);

    return `${prefix} ${formattedValue} ${suffix}`;
  }

  getFontColor(value: TimeSeriesValue) {
    const { thresholds } = this.props;

    if (thresholds.length === 1) {
      return thresholds[0].color;
    }

    const atThreshold = thresholds.filter(threshold => (value as number) === threshold.value)[0];
    if (atThreshold) {
      return atThreshold.color;
    }

    const belowThreshold = thresholds.filter(threshold => (value as number) > threshold.value);

    if (belowThreshold.length > 0) {
      const nearestThreshold = belowThreshold.sort((t1, t2) => t2.value - t1.value)[0];
      return nearestThreshold.color;
    }

    return BasicGaugeColor.Red;
  }

  getFormattedThresholds() {
    const { maxValue, minValue, thresholds } = this.props;

    const thresholdsSortedByIndex = [...thresholds].sort((t1, t2) => t1.index - t2.index);
    const lastThreshold = thresholdsSortedByIndex[thresholdsSortedByIndex.length - 1];

    const formattedThresholds = [
      ...thresholdsSortedByIndex.map(threshold => {
        if (threshold.index === 0) {
          return { value: minValue, color: threshold.color };
        }

        const previousThreshold = thresholdsSortedByIndex[threshold.index - 1];
        return { value: threshold.value, color: previousThreshold.color };
      }),
      { value: maxValue, color: lastThreshold.color },
    ];

    return formattedThresholds;
  }

  draw() {
    const {
      maxValue,
      minValue,
      timeSeries,
      showThresholdLabels,
      showThresholdMarkers,
      width,
      height,
      stat,
      theme,
    } = this.props;

    let value: TimeSeriesValue = '';

    if (timeSeries[0]) {
      value = timeSeries[0].stats[stat];
    } else {
      value = 'N/A';
    }

    const dimension = Math.min(width, height * 1.3);
    const backgroundColor = theme === ThemeNames.Light ? 'rgb(230,230,230)' : 'rgb(38,38,38)';
    const fontScale = parseInt('80', 10) / 100;
    const fontSize = Math.min(dimension / 5, 100) * fontScale;
    const gaugeWidthReduceRatio = showThresholdLabels ? 1.5 : 1;
    const gaugeWidth = Math.min(dimension / 6, 60) / gaugeWidthReduceRatio;
    const thresholdMarkersWidth = gaugeWidth / 5;
    const thresholdLabelFontSize = fontSize / 2.5;

    const options = {
      series: {
        gauges: {
          gauge: {
            min: minValue,
            max: maxValue,
            background: { color: backgroundColor },
            border: { color: null },
            shadow: { show: false },
            width: gaugeWidth,
          },
          frame: { show: false },
          label: { show: false },
          layout: { margin: 0, thresholdWidth: 0 },
          cell: { border: { width: 0 } },
          threshold: {
            values: this.getFormattedThresholds(),
            label: {
              show: showThresholdLabels,
              margin: thresholdMarkersWidth + 1,
              font: { size: thresholdLabelFontSize },
            },
            show: showThresholdMarkers,
            width: thresholdMarkersWidth,
          },
          value: {
            color: this.getFontColor(value),
            formatter: () => {
              return this.formatValue(value);
            },
            font: { size: fontSize, family: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
          },
          show: true,
        },
      },
    };

    const plotSeries = { data: [[0, value]] };

    try {
      $.plot(this.canvasElement, [plotSeries], options);
    } catch (err) {
      console.log('Gauge rendering error', err, options, timeSeries);
    }
  }

  render() {
    const { height, width } = this.props;

    return (
      <div className="singlestat-panel">
        <div
          style={{
            height: `${height * 0.9}px`,
            width: `${Math.min(width, height * 1.3)}px`,
            top: '10px',
            margin: 'auto',
          }}
          ref={element => (this.canvasElement = element)}
        />
      </div>
    );
  }
}

export default Gauge;
