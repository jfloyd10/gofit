from decimal import Decimal
from typing import Optional, Tuple, Union
from activity.models import SportType

# Sports that typically use Pace (min/km or min/mi) instead of Speed
PACE_SPORTS = {
    SportType.RUNNING,
    SportType.WALKING,
    SportType.HIKING,
    SportType.SWIMMING
}

def convert_distance(meters: Optional[Union[float, Decimal]], is_metric: bool = True) -> Tuple[Optional[float], str]:
    """
    Converts distance from meters to kilometers (metric) or miles (imperial).
    
    Args:
        meters: Distance in meters.
        is_metric: Boolean flag for unit system.
        
    Returns:
        Tuple containing (converted_value, unit_label).
        Returns (None, "") if input is None.
    """
    if meters is None:
        return None, ""
    
    val = float(meters)
    if is_metric:
        return val / 1000.0, "km"
    return val * 0.000621371, "mi"


def convert_elevation(meters: Optional[Union[float, Decimal]], is_metric: bool = True) -> Tuple[Optional[float], str]:
    """
    Converts elevation/altitude from meters to meters (metric) or feet (imperial).
    
    Args:
        meters: Elevation in meters.
        is_metric: Boolean flag for unit system.
        
    Returns:
        Tuple containing (converted_value, unit_label).
    """
    if meters is None:
        return None, ""
    
    val = float(meters)
    if is_metric:
        return val, "m"
    return val * 3.28084, "ft"


def convert_weight(kg: Optional[Union[float, Decimal]], is_metric: bool = True) -> Tuple[Optional[float], str]:
    """
    Converts weight from kilograms to kilograms (metric) or pounds (imperial).
    
    Args:
        kg: Weight in kilograms.
        is_metric: Boolean flag for unit system.
        
    Returns:
        Tuple containing (converted_value, unit_label).
    """
    if kg is None:
        return None, ""
    
    val = float(kg)
    if is_metric:
        return val, "kg"
    return val * 2.20462, "lbs"


def convert_temperature(celsius: Optional[Union[float, Decimal]], is_metric: bool = True) -> Tuple[Optional[float], str]:
    """
    Converts temperature from Celsius to Celsius (metric) or Fahrenheit (imperial).
    
    Args:
        celsius: Temperature in Celsius.
        is_metric: Boolean flag for unit system.
        
    Returns:
        Tuple containing (converted_value, unit_label).
    """
    if celsius is None:
        return None, ""
        
    val = float(celsius)
    if is_metric:
        return val, "°C"
    return (val * 9/5) + 32, "°F"


def convert_speed_to_unit(ms: Optional[Union[float, Decimal]], is_metric: bool = True) -> float:
    """
    Converts raw speed from meters/second to km/h (metric) or mph (imperial).
    Useful for charts where a numeric value is strictly required.
    
    Args:
        ms: Speed in m/s.
        is_metric: Boolean flag for unit system.
        
    Returns:
        Float value of speed in target unit. Returns 0.0 if input is None.
    """
    if ms is None:
        return 0.0
    
    val = float(ms)
    if is_metric:
        return val * 3.6  # m/s to km/h
    return val * 2.23694  # m/s to mph


def get_speed_or_pace(
    ms: Optional[Union[float, Decimal]], 
    is_metric: bool = True, 
    sport: str = None
) -> Tuple[Optional[str], str]:
    """
    Smartly converts m/s to either Speed (km/h, mph) or Pace (min/km, min/mi)
    based on the sport type.
    
    Args:
        ms: Speed in m/s.
        is_metric: Boolean flag for unit system.
        sport: The sport identifier (e.g., 'running', 'cycling').
        
    Returns:
        Tuple containing (formatted_string_value, unit_label).
        For Pace, value is "MM:SS". For Speed, value is a stringified float.
    """
    if ms is None or float(ms) == 0:
        return None, "Speed"
        
    val = float(ms)
    
    # Check if this sport uses Pace (e.g., Running)
    if sport in PACE_SPORTS:
        # Calculate Pace
        if sport == SportType.SWIMMING:
            # Swimming uses min/100m or min/100yd
            dist_unit = 100.0 if is_metric else 91.44
            label = "min/100m" if is_metric else "min/100yd"
        else:
            # Running/Walking uses min/km or min/mi
            dist_unit = 1000.0 if is_metric else 1609.34
            label = "min/km" if is_metric else "min/mi"
        
        # Avoid division by zero
        if val == 0:
            return "—", label
            
        pace_seconds = dist_unit / val
        mins = int(pace_seconds // 60)
        secs = int(pace_seconds % 60)
        return f"{mins}:{secs:02d}", label
        
    else:
        # Standard Speed
        if is_metric:
            return f"{val * 3.6:.1f}", "km/h"
        else:
            return f"{val * 2.23694:.1f}", "mph"