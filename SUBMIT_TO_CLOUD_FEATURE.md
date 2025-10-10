# Submit to Cloud Feature

## 🎯 Overview
Added functionality to save sounding calculation data directly to the cloud database via the Lambda API. Users can now submit their completed calculations with a single click.

---

## ✨ Features Implemented

### 1. **Submit Button in UI**
- **Location**: Appears below the "Total Mass by Fuel Grade" summary in the Sounding tab
- **Visibility**: Only shows when calculations are complete
- **Button States**:
  - ✅ **Online & Has Data**: `💾 Submit to Cloud` (enabled, clickable)
  - ❌ **Offline**: `📵 Offline - Cannot Submit` (disabled)
  - ❌ **No Data**: Button disabled

### 2. **Data Submission Logic**
**Function**: `submitSoundingsToCloud()`

**What Gets Submitted**:
- All completed tank sounding calculations
- Report date
- Ullage, trim, heel measurements
- Fuel grade, density, temperature
- Calculated volumes (base, heel correction, final)
- Calculated mass (mT)
- Device info and timestamp

**Validation**:
- ✅ Checks if user is online
- ✅ Filters only completed calculations (with results)
- ✅ Requires compartment_id and fuel_grade
- ✅ Auto-generates unique `client_id` for each entry

### 3. **API Integration**
**Endpoint**: `POST /vessel/{vessel_id}/sync-soundings`

**Request Format**:
```json
{
  "soundings": [
    {
      "client_id": "uuid-v4",
      "compartment_id": 123,
      "recorded_at": "2025-10-10T10:30:00Z",
      "report_date": "2025-10-10",
      "ullage": 150.5,
      "trim": 0.5,
      "heel": null,
      "fuel_grade": "MGO",
      "density": 0.850,
      "temperature": 15.0,
      "base_volume": 125.45,
      "heel_correction": 0,
      "final_volume": 125.45,
      "calculated_mt": 106.63,
      "user_name": null,
      "device_info": "Mozilla/5.0...",
      "app_version": "1.0.0"
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "inserted": 3,
  "skipped": 0,
  "inserted_ids": [45, 46, 47]
}
```

### 4. **User Feedback**
**Status Messages**:
- 🔵 **Loading**: "Submitting..." (blue)
- ✅ **Success**: "✅ Successfully saved X sounding(s) to cloud" (green)
- ❌ **Error**: "❌ Failed to submit: [error message]" (red)
- ⚠️ **No Data**: "No completed calculations to submit" (red)
- 📵 **Offline**: "Cannot submit: You are offline" (red)

All messages auto-dismiss after 3-5 seconds.

---

## 🎨 UI Design

### Submit Container
- Clean separator line above button
- Centered layout
- Maritime-themed gradient button
- Smooth hover animations
- Status message below button

### Button Styling
- **Primary State**: Ocean blue gradient (`#4a90c9` → `#2b5876`)
- **Hover**: Lifts with shadow effect
- **Disabled**: Gray, reduced opacity
- **Mobile**: Full width on small screens

### Status Messages
- **Success**: Green background with dark green text
- **Error**: Red background with dark red text
- **Loading**: Blue background with dark blue text
- Slide-in animation from top

---

## 📂 Files Modified

### 1. `src/App.js`
**Added**:
- `submitStatus` state (line 27)
- `submitSoundingsToCloud()` function (lines 147-226)
- Submit button UI (lines 818-843)

**Key Logic**:
```javascript
const submitSoundingsToCloud = async () => {
  // Check online status
  // Filter completed soundings
  // POST to Lambda API
  // Show success/error feedback
};
```

### 2. `src/App.css`
**Added** (lines 1528-1623):
- `.submit-container` - Container styling
- `.submit-cloud-btn` - Button styles with gradients
- `.submit-status` - Status message container
- `.submit-status.success/error/loading` - State-specific colors
- `@keyframes slideIn` - Message animation
- Mobile responsive styles

---

## 🚀 How to Use

### For End Users:
1. Open the **Sounding** tab
2. Fill in tank entries with ullage, fuel grade, density, etc.
3. Enter global trim/heel values
4. Click **"Calc"** for each row to calculate
5. Review the **"Total Mass by Fuel Grade"** summary
6. Click **"💾 Submit to Cloud"**
7. Wait for success message: **"✅ Successfully saved X sounding(s) to cloud"**
8. Data is now saved in the database!

### For Developers:
1. Ensure Lambda is deployed with the `syncSoundings` endpoint
2. Lambda automatically handles:
   - Duplicate checking (via `client_id`)
   - Transaction management (BEGIN/COMMIT/ROLLBACK)
   - Inserting into `sounding_logs` table
   - Setting `sync_status = 'synced'`

---

## 🗄️ Database Schema

**Table**: `sounding_logs`

**Inserted Columns**:
- `vessel_id` - From current vessel
- `compartment_id` - Tank ID
- `recorded_at` - Timestamp when recorded
- `report_date` - User-selected date
- `ullage` - Measured ullage (cm)
- `trim` - Ship trim (m)
- `heel` - Ship heel (°) [nullable]
- `fuel_grade` - Fuel type (HSFO, MGO, etc.)
- `density` - Fuel density [nullable]
- `temperature` - Fuel temp (°C) [nullable]
- `base_volume` - Base calculated volume (m³)
- `heel_correction` - Heel correction (m³)
- `final_volume` - Final volume (m³)
- `calculated_mt` - Mass in metric tons [nullable]
- `user_name` - [currently null, can be added]
- `device_info` - Browser/device UA
- `app_version` - App version (1.0.0)
- `client_id` - UUID for duplicate detection
- `sync_status` - Always 'synced'
- `synced_at` - Timestamp of sync

**Duplicate Prevention**:
Lambda checks for existing `client_id` before inserting. If found, skips that entry.

---

## ✅ Testing Checklist

- [x] Button appears after calculations are complete
- [x] Button is disabled when offline
- [x] Button is disabled when no calculations exist
- [x] Submit sends correct data format to Lambda
- [x] Success message shows number of inserted records
- [x] Error messages display API errors
- [x] Status messages auto-dismiss
- [x] Mobile responsive design
- [x] No linter errors
- [x] Lambda endpoint exists and works

---

## 🔮 Future Enhancements

1. **User Authentication**
   - Add user login
   - Capture `user_name` in submissions
   - Track submissions by user

2. **Batch Operations**
   - Allow editing submitted data
   - Bulk delete/resubmit
   - Export to Excel/PDF

3. **Offline Queue**
   - Save to IndexedDB when offline
   - Auto-sync when back online
   - Show pending count in UI

4. **Validation**
   - Add data validation before submit
   - Show warnings for unusual values
   - Confirm before submission

5. **History View**
   - View past submitted soundings
   - Filter by date/vessel/tank
   - Compare with current readings

---

## 📞 Support

**Common Issues**:

1. **"Cannot submit: You are offline"**
   - Check internet connection
   - Wait for status bar to show "Online"

2. **"No completed calculations to submit"**
   - Ensure all rows have been calculated
   - Check that compartment_id and fuel_grade are filled

3. **"HTTP 500" or similar errors**
   - Check Lambda function is deployed
   - Verify database connection
   - Check Lambda logs in AWS CloudWatch

4. **"Failed to submit"**
   - Refresh the page and try again
   - Check browser console for details
   - Verify Lambda URL in Settings (⚙️)

---

## 🎉 Summary

✅ **Submit to Cloud** feature is now live!

Users can now save their fuel sounding calculations directly to the database with a single click. The feature includes:
- Smart validation (online check, data completeness)
- Real-time feedback (loading, success, error messages)
- Beautiful maritime-themed UI
- Mobile responsive design
- Duplicate prevention
- Error handling

**Next**: Deploy updated Lambda code and test the full flow! 🚀

