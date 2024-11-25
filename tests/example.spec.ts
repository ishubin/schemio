import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
    await page.goto('http://localhost:4010/');

    await page.getByText('New Diagram').click();

    // Wait for the dynamic element to appear
    const newDiagramPopup = await page.waitForSelector('.modal-container', { timeout: 500 });

    // Assert the element is visible
    expect(await newDiagramPopup.isVisible()).toBeTruthy();

    const nameTextfield = await newDiagramPopup.$('input[type="text"][placeholder="Name..."]');
    await nameTextfield?.fill('playwright test 1');

    const createButton = await newDiagramPopup.$('.btn-primary');

    await createButton?.click();

    await page.waitForLoadState();
    const title = await page.title();
    console.log('Title is ', title);
});

