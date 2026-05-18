import pandas as pd

# Define the new headers without buckling columns
headers = [
    'Axis Name','Stroke [mm]','Move Time [s]','Acc % [%]','Dec % [%]','Cycle Time [s]',
    'Orientation θ [deg]','Payload Mass [kg]','F_pick (load) [N]','F_return [N]',
    'Friction μ [-]','Service Factor fw [-]',
    'Lead Lb [mm]','Screw Eff η [-]',
    'I_screw [kg·m²]','I_coupling [kg·m²]',
    'Gear Ratio igb [-]','Gearbox Eff ηgb [-]','Gearbox NL torque [Nm]',
    'Service Years [yr]','Operating Days [d/yr]','Hours/Day [h/d]','FOS [-]'
]

example = [
    'OP90_PnP_Vertical', 15, 1.0, 25, 25, 7.0, 90,
    2.603, 265, 15, 0.03, 1.2,
    2, 0.98, 1.07e-5, 2.67e-5,
    1, 1.0, 0.07,
    10, 312, 21, 1.25
]

df = pd.DataFrame([example], columns=headers)

# Save to the template file
template_path = '/Users/deepak/Documents/Servo/titan_servo_input_template.xlsx'
df.to_excel(template_path, index=False, sheet_name='Servo Inputs')

print(f"Template updated at {template_path}")
