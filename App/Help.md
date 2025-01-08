Welcome to FormKeeper! This guide provides answers to common questions and tips to help you get the most out of the extension.

## What is FormKeeper?

FormKeeper automatically saves your form data as you type, so you never lose your work if your browser crashes, the page reloads, or you accidentally navigate away. When you return to the page, your saved data will be restored, saving you time and frustration.

To protect your privacy and keep your saved data organized:

* Saved form data is **automatically wiped after a successful form submission**.
* You can manually clear saved data for a page by navigating to it, clicking the FormKeeper icon in the toolbar or extensions window, and selecting “Wipe Saved”.

### How Restoring Works

* **Automatic Restore**: FormKeeper automatically restores saved fields unless the field already contains content inserted by the website, to avoid overwriting important data.
* **Manual Restore**: To manually restore specific fields:
    1. Select the FormKeeper icon in the toolbar or extensions window.
    2. Expand “Saved Fields”.
    3. Select the Pencil icon next to the field you want to restore.
    
### Interacting with FormKeeper UI

FormKeeper displays a UI for interacting with saved and restored fields. You can access this UI by selecting the FormKeeper icon in the toolbar or extensions window.

Each row in the UI represents a form field.

![FormKeeper Popup UI](UI)

- The left-most icon indicates if the field's presense: present and visible, present and not visible, or absent.
- The text is the HTML selector of the field. Green text indicates the field has been restored, yellow indicates saved data hasn't been restored.
- The right-most buttons:
    - Scroll to and focus the field (enabled if present and visible)
    - Restore saved data to the field (enabled if present and saved data is available)
    - Copy saved data (enabled if saved data is available)
    - Wipe saved data (enabled if saved data is available)

## Why Isn’t It Working?

If FormKeeper isn’t behaving as expected, check the following:

1. Ensure FormKeeper is enabled:
    * Verify that FormKeeper is activated in Safari’s Extensions preferences and through your in-app purchase.
2. Restart Safari:
    * Sometimes, restarting Safari resolves minor issues.
3. Check that FormKeeper has saved your data:
    1. Select the FormKeeper icon in the toolbar or extensions window.
    2. Check "Restored fields" and "Saved fields" to see if FormKeeper has found form fields.
4. Check website compatibility:
    * FormKeeper relies on websites following the HTML standard for form elements. If a site uses non-standard practices, FormKeeper may not be able to save or restore your data.
    * Some websites dynamically change the idenfier of a form field, which prevents FormKeeper from tracking properly. Check if a field has been saved in the UI to manually copy.
    * Some websites dynamically wipe or clear fields after DOM insertion, which may prevent FormKeeper from restoring automatically. Try manually restoring through the UI.
    * Some websites use custom field elements that do not emit standard HTML events, which may prevent FormKeeper from saving data.
    * If you encounter a site where FormKeeper doesn’t work, please let us know so we can investigate! (But bear in mind that not all sites are compatible.)
