import React, { FunctionComponent } from 'react';
import { find, upperFirst } from 'lodash';
import { Color, ColorsPalete, ColorDefinition, getColorForTheme } from '../../utils/colorsPalette';
import { Themeable } from '../../types';

type ColorChangeHandler = (color: ColorDefinition) => void;

enum ColorSwatchVariant {
  Small = 'small',
  Large = 'large',
}

interface ColorSwatchProps extends React.DOMAttributes<HTMLDivElement> {
  color: string;
  label?: string;
  variant?: ColorSwatchVariant;
  isSelected?: boolean;
}

const ColorSwatch: FunctionComponent<ColorSwatchProps> = ({
  color,
  label,
  variant = ColorSwatchVariant.Small,
  isSelected,
  ...otherProps
}) => {
  const isSmall = variant === ColorSwatchVariant.Small;
  const swatchSize = isSmall ? '16px' : '32px';
  const swatchStyles = {
    width: swatchSize,
    height: swatchSize,
    borderRadius: '50%',
    background: `${color}`,
    marginRight: isSmall ? '0px' : '8px',
    boxShadow: isSelected ? `inset 0 0 0 2px ${color}, inset 0 0 0 4px white` : 'none',
    cursor: isSelected ? 'default' : 'pointer',
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
      }}
      {...otherProps}
    >
      <div style={swatchStyles} />
      {variant === ColorSwatchVariant.Large && <span>{label}</span>}
    </div>
  );
};

interface ColorsGroupProps extends Themeable {
  colors: ColorDefinition[];
  selectedColor?: Color;
  onColorSelect: ColorChangeHandler;
  key?: string;
}

const ColorsGroup: FunctionComponent<ColorsGroupProps> = ({
  colors,
  selectedColor,
  onColorSelect,
  theme,
  ...otherProps
}) => {
  const primaryColor = find(colors, color => !!color.isPrimary);

  return (
    <div {...otherProps} style={{ display: 'flex', flexDirection: 'column' }}>
      {primaryColor && (
        <ColorSwatch
          isSelected={primaryColor.name === selectedColor}
          variant={ColorSwatchVariant.Large}
          color={getColorForTheme(primaryColor, theme)}
          label={upperFirst(primaryColor.hue)}
          onClick={() => onColorSelect(primaryColor)}
        />
      )}
      <div
        style={{
          display: 'flex',
          marginTop: '8px',
        }}
      >
        {colors.map(
          color =>
            !color.isPrimary && (
              <div key={color.name} style={{ marginRight: '4px' }}>
                <ColorSwatch
                  isSelected={color.name === selectedColor}
                  color={getColorForTheme(color, theme)}
                  onClick={() => onColorSelect(color)}
                />
              </div>
            )
        )}
      </div>
    </div>
  );
};

interface NamedColorsPickerProps extends Themeable {
  color?: Color;
  onChange: (colorName: string) => void;
}

const NamedColorsPicker = ({ color, onChange, theme }: NamedColorsPickerProps) => {
  const swatches: JSX.Element[] = [];
  ColorsPalete.forEach((colors, hue) => {
    swatches.push(
      <ColorsGroup
        key={hue}
        theme={theme}
        selectedColor={color}
        colors={colors}
        onColorSelect={color => onChange(color.name)}
      />
    );
  });

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridRowGap: '32px',
        gridColumnGap: '32px',
      }}
    >
      {swatches}
    </div>
  );
};

export default NamedColorsPicker;
