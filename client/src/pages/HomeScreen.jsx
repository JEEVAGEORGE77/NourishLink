import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthModal from "../components/AuthModal";

import Logo from "../assets/logo.png";
import ConnectIcon from "../assets/connect_icon.png";
import CollectIcon from "../assets/collect_icon.png";
import CareIcon from "../assets/care_icon.png";

// Public landing page for the app.
// Shows marketing content + opens the login/signup modal when needed.
const HomeScreen = ({ initialShowAuth = false }) => {
  const navigate = useNavigate();

  // Controls whether the Auth modal is visible or not.
  // initialShowAuth lets other routes (like /auth) open this page with modal already open.
  const [showAuth, setShowAuth] = useState(!!initialShowAuth);

  // Tailwind color classes reused multiple times for consistency.
  const primaryGreen = "bg-[#005A3A]";
  const accentGold = "bg-[#B8860B]";

  return (
    // Main layout: full screen, centered content, column-based.
    <div className="min-h-screen bg-white font-sans flex flex-col items-center justify-between">
      <div className="flex-grow w-full flex flex-col items-center">
        {/* Top navigation bar with logo and login button */}
        <header
          className={`w-full ${primaryGreen} text-white shadow-lg p-4 flex justify-between items-center`}
        >
          <div className="flex items-center space-x-3">
            <img src={Logo} alt="NourishLink Logo" className="h-32 w-auto" />
            <h1 className="text-2xl font-bold tracking-widest">NourishLink</h1>
          </div>

          {/* Opens the authentication modal */}
          <button
            onClick={() => setShowAuth(true)}
            className={`py-2 px-5 ${accentGold} text-white text-sm font-semibold rounded-lg shadow-md hover:bg-yellow-700 transition duration-150`}
          >
            Login / Sign Up
          </button>
        </header>

        {/* Hero section: main headline + CTA button */}
        <section className="w-full text-center py-16 md:py-24 px-6 bg-green-50">
          <h2
            className={`text-4xl md:text-6xl font-extrabold mb-4 text-green-800`}
          >
            Connecting Surplus Food to Community Care.
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            The fastest link to{" "}
            <span className=" text-green-900">zero food waste</span>. Join our
            network of donors and volunteers making a real-time impact in
            Waterloo.
          </p>
          {/* Main CTA button also opens the Auth modal */}
          <button
            onClick={() => setShowAuth(true)}
            className={`py-4 px-10 ${accentGold} text-white text-xl font-bold rounded-xl shadow-2xl shadow-yellow-700/50 hover:bg-yellow-700 transition duration-300 transform hover:scale-105`}
          >
            Get Started Today
          </button>
        </section>

        {/* Mission section: explains the three main steps of the platform */}
        <section id="mission" className="w-full py-12 px-6 max-w-5xl">
          <h3 className="text-3xl font-bold text-center text-green-700 mb-10">
            Our Core Mission: Connect. Collect. Care.
          </h3>

          {/* Three-column feature grid for Connect / Collect / Care */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="p-6 bg-white rounded-xl shadow-lg border-t-4 border-green-500">
              <img
                src={ConnectIcon}
                alt="Connect Icon"
                className="h-16 mx-auto mb-4"
              />
              <h4 className="text-xl font-bold text-gray-800 mb-2">
                1. Connect Donors
              </h4>
              <p className="text-gray-600">
                Businesses and homes quickly post their food surplus using our
                geolocated forms.
              </p>
            </div>

            <div className="p-6 bg-white rounded-xl shadow-lg border-t-4 border-yellow-600">
              <img
                src={CollectIcon}
                alt="Collect Icon"
                className="h-16 mx-auto mb-4"
              />
              <h4 className="text-xl font-bold text-gray-800 mb-2">
                2. Collect Efficiently
              </h4>
              <p className="text-gray-600">
                Volunteers receive instant alerts and are assigned tasks based
                on proximity.
              </p>
            </div>

            <div className="p-6 bg-white rounded-xl shadow-lg border-t-4 border-blue-500">
              <img
                src={CareIcon}
                alt="Care Icon"
                className="h-16 mx-auto mb-4"
              />
              <h4 className="text-xl font-bold text-gray-800 mb-2">
                3. Care for Community
              </h4>
              <p className="text-gray-600">
                Food is quickly delivered to local shelters and centers,
                maximizing impact.
              </p>
            </div>
          </div>
        </section>

        {/* About section: high-level story and mission statement */}
        <section id="about" className="w-full py-16 px-6 bg-gray-100">
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="text-3xl font-bold text-green-700 mb-6">
              About NourishLink
            </h3>
            <p className="text-lg text-gray-700 mb-6">
              NourishLink was founded in 2023 in the heart of Waterloo Region to
              bridge the gap between food waste and food insecurity. We use
              real-time technology to dispatch our network of dedicated
              volunteers to collect and redistribute high-quality surplus food
              before it spoils.
            </p>
            <p className="text-2xl font-light italic text-gray-800">
              "Every donation collected prevents waste and feeds a neighbour.
              Join our link today."
            </p>
          </div>
        </section>

        {/* FAQ section using HTML <details> for simple collapsible questions */}
        <section id="faq" className="w-full py-16 px-6 max-w-4xl">
          <h3 className="text-3xl font-bold text-center text-green-700 mb-10">
            Frequently Asked Questions
          </h3>
          <div className="space-y-4 text-left">
            <details className="p-4 rounded-lg shadow-md bg-white border border-gray-200 cursor-pointer">
              <summary className="font-semibold text-lg text-gray-800 hover:text-green-600 transition">
                How is food safety ensured?
              </summary>
              <p className="pt-2 text-gray-600">
                All volunteers are trained in safe food handling protocols.
                Collections are optimized for speed to maintain the cold chain,
                and partner agencies verify quality upon reception.
              </p>
            </details>
            <details className="p-4 rounded-lg shadow-md bg-white border border-gray-200 cursor-pointer">
              <summary className="font-semibold text-lg text-gray-800 hover:text-green-600 transition">
                Who can donate surplus food?
              </summary>
              <p className="pt-2 text-gray-600">
                Any business (restaurants, grocery stores, bakeries) or
                individual household with food surplus can register on our
                platform to schedule a rapid pickup.
              </p>
            </details>
          </div>
        </section>

        {/* Contact section with email + phone details */}
        <section id="contact" className={`w-full py-16 px-6 bg-green-50`}>
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="text-3xl font-bold text-green-700 mb-6">
              Contact Us
            </h3>
            <p className="text-lg text-gray-700 mb-4">
              Have specific questions or want to partner with us? Reach out
              directly.
            </p>
            <div className="flex justify-center space-x-8 text-xl font-medium">
              <p>
                Email:{" "}
                <a
                  href="mailto:info@nourishlink.org"
                  className="text-green-800 hover:text-green-600 transition"
                >
                  info@nourishlink.org
                </a>
              </p>
              <p>
                Phone: <span className="text-green-800">(519) 555-FOOD</span>
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Footer with quick links, call-to-action, and fake social icons */}
      <footer className={`w-full ${primaryGreen} text-white mt-auto py  -8`}>
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h4 className="text-xl font-bold mb-3">NourishLink</h4>
            <p className="text-sm text-gray-300">
              Zero food waste, maximum community impact. Serving Waterloo
              Region.
            </p>
          </div>

          {/* Internal anchor links to sections above */}
          <div>
            <h4 className="text-lg font-semibold mb-3 border-b-2 border-[#B8860B] inline-block">
              Quick Links
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#about" className="hover:text-[#B8860B] transition">
                  About Us
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-[#B8860B] transition">
                  FAQ & Support
                </a>
              </li>
              <li>
                <a href="#mission" className="hover:text-[#B8860B] transition">
                  Our Mission
                </a>
              </li>
              <li>
                <a href="#contact" className="hover:text-[#B8860B] transition">
                  Contact Us
                </a>
              </li>
            </ul>
          </div>

          {/* Footer CTAs that also open the Auth modal */}
          <div>
            <h4 className="text-lg font-semibold mb-3 border-b-2 border-[#B8860B] inline-block">
              Get Involved
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  onClick={() => setShowAuth(true)}
                  className="hover:text-[#B8860B] transition cursor-pointer"
                >
                  Become a Donor
                </a>
              </li>
              <li>
                <a
                  onClick={() => setShowAuth(true)}
                  className="hover:text-[#B8860B] transition cursor-pointer"
                >
                  Volunteer
                </a>
              </li>
            </ul>
          </div>

          {/* Contact details + social icons grouped in footer */}
          <div>
            <h4 className="text-lg font-semibold mb-3 border-b-2 border-[#B8860B] inline-block">
              Contact Details
            </h4>
            <div className="text-sm space-y-2">
              <p>
                Email:{" "}
                <a
                  href="mailto:info@nourishlink.org"
                  className="hover:text-[#B8860B]"
                >
                  info@nourishlink.org
                </a>
              </p>
              <p>Phone: (519) 555-FOOD</p>
            </div>
            <div className="flex space-x-4 mt-3">
              {/* Placeholder icons for Instagram and Facebook */}
              <span className="text-lg hover:text-[#B8860B] cursor-pointer">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-instagram"
                >
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </span>
              <span className="text-lg hover:text-[#B8860B] cursor-pointer">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-facebook"
                >
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </span>
            </div>
          </div>
        </div>

        {/* Copyright line using the current year */}
        <div className="mt-8 pt-4 border-t border-gray-700 text-center text-sm text-gray-400">
          &copy; {new Date().getFullYear()} NourishLink. All rights reserved.
        </div>
      </footer>

      {/* Auth modal mounted at the bottom so it can overlay entire page */}
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
};

export default HomeScreen;
