# Learning & Blocker Journal

## Project

Northstar Webhook Verification Prototype

## 1. Unfamiliar Concept

The unfamiliar concept I explored was webhook verification using HMAC-SHA256.

A webhook allows one system to send data to another system through an HTTP request. Webhook verification adds security by allowing the receiving server to check whether the request contains a valid signature.

## 2. Resources and Tools Used

- VS Code
- Node.js
- npm
- Express.js
- PowerShell
- Node.js crypto module
- Command-line testing

## 3. Blockers and Solutions

### Blocker 1: Terminal/npm problem

I initially experienced problems running npm commands in the terminal.

I checked that Node.js was installed and then used a suitable terminal environment to continue working.

### Blocker 2: server.js was missing

The project directory initially did not contain server.js.

I used the directory listing to check the project files and then created the required server.js file.

### Blocker 3: JSON parsing error

My first cURL webhook test produced a JSON parsing error.

The problem was caused by how the JSON quotation marks were interpreted by PowerShell.

I changed the testing approach and used Invoke-RestMethod to send the JSON request.

### Blocker 4: Old code was still running

The server continued returning the old response even after I prepared the verification code.

I checked server.js and discovered that the old code was still present.

I replaced the code, saved the file, stopped the running server, and restarted it.

### Blocker 5: ReferenceError

The server produced:

ReferenceError: S is not defined

I inspected server.js and found an accidental extra "S" at the end of the file.

I removed it, saved the file, and restarted the server successfully.

## 4. Testing Results

### Test 1: Request without signature

Result:

Missing signature

Status:

PASS — the server rejected the request.

### Test 2: Request with fake signature

Result:

Invalid signature

Status:

PASS — the server rejected the request.

### Test 3: Request with valid signature

Result:

Webhook verified successfully

Status:

PASS — the server accepted the request.

## 5. What I Learned

I learned how to:

- Set up a Node.js project.
- Install and use Express.js.
- Create a webhook endpoint.
- Receive JSON data through a POST request.
- Use HMAC-SHA256 for signature verification.
- Test webhook requests.
- Identify and troubleshoot programming errors.
- Restart a Node.js server after changing its code.

## 6. Reflection

At the beginning, working with Node.js, npm, Express, and the terminal was unfamiliar to me.

The project involved several errors, including missing files, JSON formatting problems, and a JavaScript ReferenceError.

By investigating the errors and testing each change, I was able to get the prototype working.

The most important thing I learned was that programming problems can often be solved by reading the error message carefully, checking the files involved, making one change at a time, and testing again.