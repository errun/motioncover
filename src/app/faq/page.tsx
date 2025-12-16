import Header from "@/components/Header";
import Footer from "@/components/Footer";

const faqs = [
  {
    question: "What is a Spotify Canvas?",
    answer: "Spotify Canvas is a short looping video that artists can add to their tracks. These videos play in a loop while you listen to a song on Spotify, making the listening experience more visually engaging."
  },
  {
    question: "How do I download a Canvas?",
    answer: "Simply paste a Spotify track link into the search box on our homepage, or search for an artist. If the track has a Canvas, you'll be able to preview and download it."
  },
  {
    question: "Do all Spotify tracks have a Canvas?",
    answer: "No, not all tracks have a Canvas. Canvas videos are optional and must be uploaded by the artist or their label. Many popular tracks do have them, but it's not universal."
  },
  {
    question: "What format is the Canvas downloaded in?",
    answer: "Canvas videos are downloaded in MP4 format, which is compatible with most video players and editing software."
  },
  {
    question: "Is this service free?",
    answer: "Yes! Canvas Downloader is completely free to use with no ads or tracking. We believe in providing a clean, simple experience."
  },
  {
    question: "Is this affiliated with Spotify?",
    answer: "No, Canvas Downloader is an independent project and is not affiliated with, endorsed by, or sponsored by Spotify."
  },
  {
    question: "Can I use downloaded Canvas videos commercially?",
    answer: "The Canvas videos are owned by the artists and labels. You should obtain proper permissions before using them for commercial purposes. Personal use is generally acceptable."
  },
  {
    question: "Why can't I find a Canvas for a specific track?",
    answer: "There could be several reasons: the artist hasn't uploaded a Canvas for that track, the Canvas might be region-restricted, or there could be a temporary issue with our service."
  }
];

export default function FAQPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-12 px-4 max-w-3xl mx-auto w-full">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-8 text-center">
          Frequently Asked Questions
        </h1>
        
        <div className="space-y-6">
          {faqs.map((faq, index) => (
            <div key={index} className="bg-[#181818] rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-3">
                {faq.question}
              </h2>
              <p className="text-white/70 leading-relaxed">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}

