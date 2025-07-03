document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
    // IMPORTANT: Replace 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE' with YOUR deployed Google Apps Script Web App URL.
    // See the "Backend Setup" section below for instructions on how to get this URL.
    const SCRIPT_URL = "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE"; 

    // --- GLOBAL VARIABLES ---
    let cachedResults = []; // To store results when multiple are found for a search

    // --- ELEMENT REFERENCES ---
    // General UI elements
    const modeSelector = document.getElementById('modeSelector');
    const addSurveySection = document.getElementById('addSurveySection');
    const getSurveySection = document.getElementById('getSurveySection');

    // Elements for "Add Survey" form
    const addSurveyForm = document.getElementById('addSurveyForm');
    const addSurveyButton = document.getElementById('addSurveyButton');
    const addFeedbackMessage = document.getElementById('addFeedbackMessage');
    const surveyUrlInput = document.getElementById('surveyUrl');
    const targetGroupInput = document.getElementById('targetGroup');
    const bypassLinkInput = document.getElementById('bypassLink'); // Added for clarity
    const additionalDetailsInput = document.getElementById('additionalDetails'); // Added for clarity
    const surveyUrlError = document.getElementById('surveyUrlError');
    const targetGroupError = document.getElementById('targetGroupError');

    // Elements for "Get Survey" form and results display
    const getSurveyForm = document.getElementById('getSurveyForm');
    const getSurveyButton = document.getElementById('getSurveyButton');
    const getFeedbackMessage = document.getElementById('getFeedbackMessage');
    const searchSurveyUrlInput = document.getElementById('searchSurveyUrl');
    const searchSurveyUrlError = document.getElementById('searchSurveyUrlError');
    const multipleResultsSection = document.getElementById('multipleResultsSection');
    const multipleResultsSelector = document.getElementById('multipleResultsSelector');
    const resultsContainer = document.getElementById('resultsContainer');
    const copyButton = document.getElementById('copyButton');

    // Elements where search results are displayed
    const resultTargetGroup = document.getElementById('resultTargetGroup');
    const resultBypassLink = document.getElementById('resultBypassLink');
    const resultAdditionalDetails = document.getElementById('resultAdditionalDetails');

    // --- EVENT LISTENERS ---
    // Listen for changes on the mode selector (Add/Get)
    modeSelector.addEventListener('change', switchMode);
    // Listen for form submissions
    addSurveyForm.addEventListener('submit', handleAddSurvey);
    getSurveyForm.addEventListener('submit', handleGetSurvey);
    // Listen for selection changes when multiple results are found
    multipleResultsSelector.addEventListener('change', displaySelectedResult);
    // Listen for click on the copy button
    copyButton.addEventListener('click', handleCopy);

    // Real-time input validation as user types
    surveyUrlInput.addEventListener('input', () => validateInput(surveyUrlInput, surveyUrlError));
    targetGroupInput.addEventListener('input', () => validateInput(targetGroupInput, targetGroupError));
    searchSurveyUrlInput.addEventListener('input', () => validateInput(searchSurveyUrlInput, searchSurveyUrlError));


    // --- FUNCTIONS ---

    /**
     * Switches between the "Add Survey" and "Get Survey" sections.
     * @param {Event} e - The change event from the mode selector.
     */
    function switchMode(e) {
        const mode = e.target.value;
        // Show/hide sections based on selected mode
        addSurveySection.classList.toggle('hidden', mode !== 'add');
        getSurveySection.classList.toggle('hidden', mode !== 'get');
        // Reset UI for both sections when switching
        resetGetSurveyUI();
        resetAddSurveyUI();
    }

    /**
     * Validates an input field based on its required attribute and type.
     * Displays an error message if validation fails.
     * @param {HTMLElement} inputElement - The input element to validate.
     * @param {HTMLElement} errorElement - The small element to display error messages.
     * @returns {boolean} - True if validation passes, false otherwise.
     */
    function validateInput(inputElement, errorElement) {
        // Check if required field is empty
        if (inputElement.hasAttribute('required') && inputElement.value.trim() === '') {
            errorElement.textContent = 'This field is required.';
            errorElement.classList.add('show');
            return false;
        } 
        // Check if it's a URL input and not a valid URL (if not empty)
        else if (inputElement.type === 'url' && inputElement.value.trim() !== '' && !isValidUrl(inputElement.value.trim())) {
            errorElement.textContent = 'Please enter a valid URL.';
            errorElement.classList.add('show');
            return false;
        } 
        // Validation passes
        else {
            errorElement.textContent = '';
            errorElement.classList.remove('show');
            return true;
        }
    }

    /**
     * Checks if a given string is a valid URL.
     * @param {string} string - The string to validate.
     * @returns {boolean} - True if the string is a valid URL, false otherwise.
     */
    function isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Handles the submission of the "Add New Survey" form.
     * Sends survey data to the Google Apps Script backend.
     * @param {Event} e - The form submit event.
     */
    async function handleAddSurvey(e) {
        e.preventDefault();

        // Validate all required fields before proceeding
        const isSurveyUrlValid = validateInput(surveyUrlInput, surveyUrlError);
        const isTargetGroupValid = validateInput(targetGroupInput, targetGroupError);

        if (!isSurveyUrlValid || !isTargetGroupValid) {
            showFeedback('Please fill in all required fields correctly.', 'error', addFeedbackMessage);
            return;
        }

        // Prepare data to send
        const data = {
            surveyUrl: surveyUrlInput.value.trim(),
            targetGroup: targetGroupInput.value.trim(),
            bypassLink: bypassLinkInput.value.trim(),
            additionalDetails: additionalDetailsInput.value.trim()
        };

        setLoadingState(true, addSurveyButton, 'REGISTERING...'); // Show loading state
        addFeedbackMessage.classList.remove('show'); // Hide any previous feedback message

        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'cors', // Crucial for cross-origin requests to Apps Script
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8' // Required by Google Apps Script for JSON body
                },
                body: JSON.stringify(data) // Send data as JSON string
            });

            if (!response.ok) {
                // If HTTP status is not 2xx, throw an error
                const errorText = await response.text();
                throw new Error(`Server error: ${response.status} - ${errorText}`);
            }

            const result = await response.json();

            if (result.result === 'success') {
                showFeedback('Survey registered successfully!', 'success', addFeedbackMessage);
                addSurveyForm.reset(); // Clear the form
                // Clear validation errors after successful submission
                surveyUrlError.classList.remove('show');
                targetGroupError.classList.remove('show');
            } else {
                // If Apps Script returns an error in its JSON response
                throw new Error(result.message || 'An unknown error occurred.');
            }
        } catch (err) {
            console.error("Error adding survey:", err);
            showFeedback(`Failed to register survey: ${err.message}`, 'error', addFeedbackMessage);
        } finally {
            setLoadingState(false, addSurveyButton, 'Save Survey'); // Reset loading state
        }
    }

    /**
     * Handles the submission of the "Get Survey Information" form.
     * Fetches survey data from the Google Apps Script backend.
     * @param {Event} e - The form submit event.
     */
    async function handleGetSurvey(e) {
        e.preventDefault();
        resetGetSurveyUI(); // Reset UI before a new search

        const urlToSearch = searchSurveyUrlInput.value.trim();

        // Validate the search URL input
        const isSearchUrlValid = validateInput(searchSurveyUrlInput, searchSurveyUrlError);
        if (!isSearchUrlValid) {
            showFeedback('Please enter a valid survey URL to search.', 'error', getFeedbackMessage);
            return;
        }

        setLoadingState(true, getSurveyButton, 'FETCHING...'); // Show loading state
        getFeedbackMessage.classList.remove('show'); // Hide any previous feedback message

        // Construct the fetch URL with the survey URL as a query parameter
        const fetchUrl = `${SCRIPT_URL}?url=${encodeURIComponent(urlToSearch)}`;

        try {
            const response = await fetch(fetchUrl);

            if (!response.ok) {
                // If HTTP status is not 2xx, throw an error
                const errorText = await response.text();
                throw new Error(`Server error: ${response.status} - ${errorText}`);
            }

            const res = await response.json();

            if (res.found) {
                cachedResults = res.results; // Store all found results
                if (res.count === 1) {
                    displayResult(cachedResults[0]); // Display immediately if only one result
                    showFeedback('Survey found!', 'success', getFeedbackMessage);
                } else {
                    // If multiple results, populate a dropdown for selection
                    showFeedback(`Found ${res.count} entries for this URL. Select below to view.`, 'success', getFeedbackMessage);
                    populateMultipleResultsSelector(cachedResults);
                }
            } else {
                // No survey found
                showFeedback(res.message || 'No survey found for this URL.', 'error', getFeedbackMessage);
            }
        } catch (err) {
            console.error("Error getting survey:", err);
            showFeedback(`Failed to retrieve survey: ${err.message}`, 'error', getFeedbackMessage);
        } finally {
            setLoadingState(false, getSurveyButton, 'Find Details'); // Reset loading state
        }
    }

    /**
     * Populates the dropdown selector with timestamps when multiple results are found.
     * @param {Array<Object>} results - An array of survey data objects.
     */
    function populateMultipleResultsSelector(results) {
        multipleResultsSelector.innerHTML = '<option value="">-- Select a timestamp --</option>'; // Default option
        results.forEach((result, index) => {
            // Convert Google Sheets timestamp (milliseconds since epoch) to a readable date string
            const date = new Date(parseInt(result.timestamp)).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short'});
            const option = new Option(`${date}`, index); // Option value is the index in cachedResults
            multipleResultsSelector.add(option);
        });
        multipleResultsSection.classList.remove('hidden'); // Show the dropdown
    }

    /**
     * Displays the survey details based on the selected item in the multiple results dropdown.
     */
    function displaySelectedResult() {
        const selectedIndex = multipleResultsSelector.value;
        if (selectedIndex !== "") {
            // Display the result corresponding to the selected index
            displayResult(cachedResults[selectedIndex]);
        } else {
            // Hide results if no option is selected
            resultsContainer.classList.add('hidden');
            // Clear displayed content
            resultTargetGroup.textContent = '';
            resultBypassLink.textContent = '';
            resultAdditionalDetails.textContent = '';
            copyButton.classList.add('hidden');
        }
    }

    /**
     * Populates the results display area with survey information.
     * @param {Object} result - The survey data object to display.
     */
    function displayResult(result) {
        resultTargetGroup.textContent = result.targetGroup || 'N/A';
        resultBypassLink.textContent = result.bypassLink || 'N/A';
        resultAdditionalDetails.textContent = result.additionalDetails || 'N/A';
        
        // Show/hide copy button based on bypass link availability
        copyButton.classList.toggle('hidden', !result.bypassLink || result.bypassLink === 'N/A');
        resultsContainer.classList.remove('hidden'); // Show the results container
    }

    /**
     * Copies the bypass link text to the clipboard.
     * Provides visual feedback to the user.
     */
    function handleCopy() {
        const textToCopy = resultBypassLink.textContent;
        if (textToCopy && textToCopy !== 'N/A') {
            navigator.clipboard.writeText(textToCopy).then(() => {
                const originalText = copyButton.textContent;
                copyButton.textContent = 'Copied!';
                setTimeout(() => { copyButton.textContent = originalText; }, 2000); // Revert text after 2 seconds
            }).catch(err => {
                console.error('Failed to copy text: ', err);
                // Fallback for environments where clipboard API might not work (e.g., some iframes)
                // Note: alert() is generally avoided in production apps, but used here as a last resort fallback.
                // For a real app, consider a custom modal or toast notification.
                // For Canvas, avoid alert().
                showFeedback('Failed to copy. Please copy manually.', 'error', getFeedbackMessage);
            });
        }
    }

    /**
     * Resets the UI elements for the "Get Survey Information" section.
     */
    function resetGetSurveyUI() {
        getFeedbackMessage.classList.remove('show');
        getFeedbackMessage.textContent = '';
        multipleResultsSection.classList.add('hidden');
        multipleResultsSelector.innerHTML = ''; // Clear dropdown options
        resultsContainer.classList.add('hidden');
        searchSurveyUrlInput.value = ''; // Clear search input field
        searchSurveyUrlError.classList.remove('show'); // Clear search input error
        cachedResults = []; // Clear cached results
        // Clear displayed results content
        resultTargetGroup.textContent = '';
        resultBypassLink.textContent = '';
        resultAdditionalDetails.textContent = '';
        copyButton.classList.add('hidden');
    }

    /**
     * Resets the UI elements for the "Add New Survey" section.
     */
    function resetAddSurveyUI() {
        addFeedbackMessage.classList.remove('show');
        addFeedbackMessage.textContent = '';
        addSurveyForm.reset(); // Reset form fields
        surveyUrlError.classList.remove('show'); // Clear validation errors
        targetGroupError.classList.remove('show');
    }
    
    /**
     * Sets the loading state for a button (disables it and changes text).
     * @param {boolean} isLoading - True to show loading, false to revert.
     * @param {HTMLElement} button - The button element to modify.
     * @param {string} loadingText - The text to display when loading.
     */
    function setLoadingState(isLoading, button, loadingText) {
        if (isLoading) {
            button.dataset.originalText = button.textContent; // Store original text
            button.textContent = loadingText;
        } else {
            button.textContent = button.dataset.originalText || button.textContent; // Restore original text or keep current
        }
        button.disabled = isLoading; // Disable button when loading
    }

    /**
     * Displays a feedback message to the user.
     * @param {string} message - The message to display.
     * @param {'success'|'error'} type - The type of message (for styling).
     * @param {HTMLElement} element - The HTML element to display the message in.
     */
    function showFeedback(message, type, element) {
        element.textContent = message;
        element.className = `feedback-message ${type}`; // Apply class for styling
        element.classList.add('show'); // Make visible
    }
});
