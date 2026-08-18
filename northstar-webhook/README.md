# Northstar Webhook Verification Prototype

## 1. Project Overview

Northstar is a mini webhook verification prototype built to demonstrate how a server can receive webhook requests and verify that they contain a valid signature.

The prototype uses Node.js, Express, and HMAC-SHA256 signature verification.

## 2. Objective

The objective of the prototype is to ensure that the webhook does not automatically trust every incoming request.

The server checks whether the request contains a valid signature before accepting the webhook data.

## 3. Technologies Used

- Node.js
- Express.js
- JavaScript
- HMAC-SHA256
- PowerShell
- VS Code

## 4. How It Works

The webhook endpoint is:

    POST /webhook

When a request arrives, the server:

1. Checks whether a signature was provided.
2. Creates the expected HMAC-SHA256 signature using the shared secret.
3. Compares the received signature with the expected signature.
4. Rejects the request if the signature is missing or incorrect.
5. Accepts the request when the signatures match.

## 5. Testing

### Test 1: No Signature

A webhook request was sent without a signature.

Result:

    Missing signature

The request was rejected.

### Test 2: Invalid Signature

A fake signature was supplied.

Result:

    Invalid signature

The request was rejected.

### Test 3: Valid Signature

A correct HMAC-SHA256 signature was generated using the shared secret.

Result:

    Webhook verified successfully

The request was accepted.

## 6. Troubleshooting

During development, several problems were encountered.

### Problem 1: npm/terminal issue

The terminal initially had problems executing npm commands.

Resolution:
I tested the Node.js installation and used a suitable terminal environment to continue.

### Problem 2: server.js not found

The project initially did not contain the expected server.js file.

Resolution:
I checked the project directory, created the required file, and placed it in the correct folder.

### Problem 3: JSON parsing error

The first cURL test produced a JSON parsing error because of command-line quotation handling.

Resolution:
I switched to PowerShell's Invoke-RestMethod for sending the JSON request.

### Problem 4: Old server code was still running

The server continued returning the original webhook response after the verification code had been prepared.

Resolution:
I checked server.js, replaced the old code, saved the file, stopped the running server, and restarted it.

### Problem 5: ReferenceError

The server produced:

    ReferenceError: S is not defined

Resolution:
I found an accidental extra "S" at the end of server.js, removed it, saved the file, and restarted the server.

## 7. Lessons Learned

Through this project I learned:

- How to create and run a basic Node.js server.
- How Express handles POST requests.
- How webhook endpoints receive JSON data.
- Why webhook verification is important.
- How HMAC-SHA256 can be used to verify a request signature.
- How to test valid and invalid requests.
- How to troubleshoot programming and terminal errors.

## 8. Current Status

The prototype successfully:

- Starts the Node.js server.
- Receives webhook requests.
- Rejects requests without signatures.
- Rejects requests with invalid signatures.
- Accepts requests with a valid signature.