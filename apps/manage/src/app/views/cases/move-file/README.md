# Move Files
This is the directory for handling the moving of files between folders.

## Post-Redirect-Get Architecture
- This starts with a POST request with a body of file IDs, this saves the IDs to the session, and then redirects as a GET to the same endpoint.
- In the GET request the files are grabbed from the session and then the Journey begins.

## Mini-Journey
- The move is handled in a miniature Journey, with only one question.
- This allows us to get the session storage and the CYA page for free.

## Folder select component
- Custom component located at `packages/lib/forms/custom-components/nested-folder-radio/question.ts`
- It is a radio component that involves nesting radios within radios, with each radio representing a new folder to move to
- It unnests as you select folders and work down the chain

### Example:

- Folder 1
    - Sub Folder 1.1
    - Sub Folder 1.2
        - Sub Folder 2.1
- Folder 2
- Folder 3