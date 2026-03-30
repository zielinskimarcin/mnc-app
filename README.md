# MNC Concept - iOS Mobile Application

A custom-built loyalty and menu management solution developed for the MNC Concept cafe in Poland. The application is currently deployed and undergoing beta testing via Apple TestFlight.

## Core Functionality

* **Real-time Menu Synchronization:** Dynamic menu updates powered by Supabase Real-time. Any changes made in the Admin Dashboard are reflected instantly for mobile users.
* **Loyalty & Rewards System:** Users accumulate points for purchases which can be exchanged for rewards. Each profile generates a unique identifier for staff verification and point processing.
* **Push Notification Engine:** Integrated system for real-time and scheduled promotional notifications, allowing direct engagement with the user base.
* **User Accounts:** Secure authentication and profile management for tracking individual point balances and history.

## Technical Architecture

* **Frontend:** Built with React Native (TypeScript) and Expo for a high-performance, cross-platform experience.
* **Backend & Database:** Utilizes Supabase (PostgreSQL) for data persistence and real-time event handling.
* **Serverless Logic:** Implementation of Supabase Edge Functions for secure handling of loyalty point transactions and notification scheduling.

## Tech Stack

* React Native (TypeScript)
* Expo
* Supabase (PostgreSQL, Real-time, Auth, Edge Functions)
* iOS (TestFlight Deployment)

## Previews
| | | |
|:---:|:---:|:---:|
| <img src="https://github.com/user-attachments/assets/47461181-d631-4669-ac8d-69fe5fe28d2f" width="200" /> | <img src="https://github.com/user-attachments/assets/3d0bab5d-87eb-4f27-82e8-0949d2371828" width="200" /> | <img src="https://github.com/user-attachments/assets/232e8f36-d021-4b00-bede-cbaa6112a643" width="200" /> |
| **Menu View** | **Rewards Shop** | **Loyalty Code** |

| | |
|:---:|:---:|
| <img src="https://github.com/user-attachments/assets/f5962c43-01a9-444e-924b-b8145e5dace0" width="200" /> | <img src="https://github.com/user-attachments/assets/260d12e6-e00b-43cc-bbfb-3364b3cfbd88" width="200" /> |
| **Login Screen** | **User Profile** |

---
*Note: This repository covers the mobile client. The management interface is located in another repository.*
